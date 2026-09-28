import {
  formatServerError,
  formatGraphQLError,
  decodeId,
  dispatchMutationErr,
  dispatchMutationReq,
  dispatchMutationResp,
} from "@openimis/fe-core";
import { computeLedgerEntryTotals } from "./utils/ledgerEntryTotals";
import { firstErrorMessage, graphqlErrorMessage } from "./utils/graphqlErrors";
import { parseCurrencies } from "./utils/currencies";

// Flux Standard Action triplet suffixes, consistent with every other
// openimis-fe-* module in this environment (research.md §1).
export const ACTION_TYPE = {
  LEDGER_ENTRIES: "LEDGER_LEDGER_ENTRIES",
  ACCOUNTING_PERIODS: "LEDGER_ACCOUNTING_PERIODS",
  PARTY_SEARCH: "LEDGER_PARTY_SEARCH",
  PARTY_LEDGER_BALANCE: "LEDGER_PARTY_LEDGER_BALANCE",
  PARTY_LEDGER_BALANCE_RESET: "LEDGER_PARTY_LEDGER_BALANCE_RESET",
  FUNDER_SEARCH: "LEDGER_FUNDER_SEARCH",
  JOURNAL_SEARCH: "LEDGER_JOURNAL_SEARCH",
  FUNDER_ACTIVITY_REPORT: "LEDGER_FUNDER_ACTIVITY_REPORT",
  MANUAL_REVIEW_QUEUE: "LEDGER_MANUAL_REVIEW_QUEUE",
  DEPLOYMENT_CONFIGURATION: "LEDGER_DEPLOYMENT_CONFIGURATION",
  ACCOUNT_OPTIONS: "LEDGER_ACCOUNT_OPTIONS",
  ACCOUNTS: "LEDGER_ACCOUNTS",
  CREATE_ACCOUNT: "LEDGER_CREATE_ACCOUNT",
  UPDATE_ACCOUNT: "LEDGER_UPDATE_ACCOUNT",
  DELETE_ACCOUNT: "LEDGER_DELETE_ACCOUNT",
  JOURNALS: "LEDGER_JOURNALS",
  JOURNAL_TYPES: "LEDGER_JOURNAL_TYPES",
  CREATE_JOURNAL: "LEDGER_CREATE_JOURNAL",
  UPDATE_JOURNAL: "LEDGER_UPDATE_JOURNAL",
  DELETE_JOURNAL: "LEDGER_DELETE_JOURNAL",
  OPEN_ACCOUNTING_PERIOD: "LEDGER_OPEN_ACCOUNTING_PERIOD",
  LOCK_ACCOUNTING_PERIOD: "LEDGER_LOCK_ACCOUNTING_PERIOD",
  CLOSE_ACCOUNTING_PERIOD: "LEDGER_CLOSE_ACCOUNTING_PERIOD",
  REOPEN_ACCOUNTING_PERIOD: "LEDGER_REOPEN_ACCOUNTING_PERIOD",
  RESOLVE_MANUAL_REVIEW_ITEM: "LEDGER_RESOLVE_MANUAL_REVIEW_ITEM",
  EXPORT_ACCOUNTING_PERIOD: "LEDGER_EXPORT_ACCOUNTING_PERIOD",
  EXPORT_SEQUENCES: "LEDGER_EXPORT_SEQUENCES",
  CONFIGURE_DEPLOYMENT: "LEDGER_CONFIGURE_DEPLOYMENT",
};

const req = (name) => `${name}_REQ`;
const serviceFor = (services, actionType) => services[actionType.replace(/_RESP$/, "")];

// Mutation payloads carry ids only: `dispatchMutationResp` needs the payload
// field name to pick up `internalId` for the JournalDrawer.
const ACCOUNT_MUTATION_SERVICES = {
  [ACTION_TYPE.CREATE_ACCOUNT]: "createAccount",
  [ACTION_TYPE.UPDATE_ACCOUNT]: "updateAccount",
  [ACTION_TYPE.DELETE_ACCOUNT]: "deleteAccount",
};

const JOURNAL_MUTATION_SERVICES = {
  [ACTION_TYPE.CREATE_JOURNAL]: "createJournal",
  [ACTION_TYPE.UPDATE_JOURNAL]: "updateJournal",
  [ACTION_TYPE.DELETE_JOURNAL]: "deleteJournal",
};

const resp = (name) => `${name}_RESP`;
const err = (name) => `${name}_ERR`;

// data-model.md "Redux state shape" — every slice present from the start
// (Phase 2 foundational requirement) even though most fetch actions/reducer
// cases are implemented in later phases (US2-US7).
const initialState = {
  ledgerEntries: {
    isFetching: false,
    isFetched: false,
    error: null,
    items: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    filters: {
      journal: null,
      accountingPeriodId: null,
      partyAnalyticValueId: null,
      funderAnalyticValueId: null,
      sourceEventType: null,
    },
  },

  partySearch: { isFetching: false, isFetched: false, error: null, results: [] },
  partyLedgerBalance: {
    isFetching: false,
    isFetched: false,
    error: null,
    items: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },

  funderSearch: { isFetching: false, isFetched: false, error: null, results: [] },
  funderActivityReport: { isFetching: false, isFetched: false, error: null, data: null },

  journalSearch: { isFetching: false, isFetched: false, error: null, results: [], fetchedType: null },

  accountingPeriods: { isFetching: false, isFetched: false, error: null, items: [] },
  periodMutation: { submitting: false, error: null, lastRejectionReason: null },

  // Standard openIMIS mutation tracking (feeds the JournalDrawer).
  mutation: {},
  submittingMutation: false,

  manualReviewQueue: {
    isFetching: false,
    isFetched: false,
    error: null,
    items: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },
  reviewResolution: { submitting: false, error: null },

  exportJobs: { byPeriodId: {}, error: null },

  deploymentConfiguration: { isFetching: false, isFetched: false, error: null, data: null, submitting: false },

  accountOptions: { isFetching: false, isFetched: false, error: null, items: [] },

  accounts: {
    isFetching: false,
    isFetched: false,
    error: null,
    items: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },

  accountMutation: { submitting: false, error: null, lastMutationAt: null },

  journals: {
    isFetching: false,
    isFetched: false,
    error: null,
    items: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },

  journalTypes: { isFetching: false, isFetched: false, error: null, items: [] },

  journalMutation: { submitting: false, error: null, lastMutationAt: null },
};

const decodeLedgerReferenceId = (id) => {
  if (id === null || id === undefined) return id;
  const decoded = decodeId(id);
  if (decoded !== id || /^\d+$/.test(id)) return decoded;
  try {
    const parts = atob(id).split(":");
    return parts.length > 1 ? parts[1] : decoded;
  } catch {
    return decoded;
  }
};

// Backend AccountingPeriod.status is a SmallIntegerField (1=open, 2=locked,
// 3=closed) while the frontend view-model uses strings. Normalize on ingest so
// components keep comparing `status === "open"` etc.
const PERIOD_STATUS_LABELS = { 1: "open", 2: "locked", 3: "closed", A_1: "open", A_2: "locked", A_3: "closed" };
const mapPeriodStatus = (status) => PERIOD_STATUS_LABELS[status] ?? status;

// Derives the legacy `{ analyticValueId, displayName }` tag view-model from the
// real backend's `analyticTags` (filtered by axis code). Returns null when the
// line carries no tag for that axis.
const mapAnalyticTag = (analyticTags, axisCode) => {
  const value = (analyticTags || []).find(
    (tag) => tag?.analyticValue?.axis?.code?.toLowerCase() === axisCode,
  )?.analyticValue;
  return value ? { analyticValueId: value.id, displayName: value.displayName } : null;
};

// Entry-level party/funder: the whole transaction is tagged server-side, so a
// leg without its own analytic tag reuses the tag carried by the entry.
const mapEntryTag = (value) => (value ? { analyticValueId: value.id, displayName: value.displayName } : null);

const mapLedgerEntryLine = (line, entryTags = {}) => ({
  id: decodeLedgerReferenceId(line.id),
  account: line.account,
  debit: line.debit,
  credit: line.credit,
  partyTag: line.partyTag || mapAnalyticTag(line.analyticTags, "party") || entryTags.partyTag || null,
  funderTag: line.funderTag || mapAnalyticTag(line.analyticTags, "funder") || entryTags.funderTag || null,
});

// The backend `ledgerEntries` connection exposes neither an `orderBy` argument
// nor a default ordering (the model has no Meta.ordering), so the current page
// is ordered client-side: newest posted first by default.
const LEDGER_ENTRY_SORT_KEYS = {
  journal: (entry) => entry.journal?.code || entry.journal?.name || "",
  accountingPeriod: (entry) => entry.accountingPeriod?.code || "",
  sourceEventType: (entry) => entry.sourceEventType || "",
  postedAt: (entry) => entry.postedAt || "",
};

const sortLedgerEntries = (items, orderBy) => {
  const order = orderBy || "-postedAt";
  const descending = order.startsWith("-");
  const field = descending ? order.slice(1) : order;
  const keyOf = LEDGER_ENTRY_SORT_KEYS[field] || LEDGER_ENTRY_SORT_KEYS.postedAt;
  return [...items].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka === kb) return 0;
    return (ka > kb ? 1 : -1) * (descending ? -1 : 1);
  });
};

const mapLedgerEntryNode = (node) => {
  // The backend returns the legs as a Relay connection
  // (`transaction.legs.edges[].node`); the flat `lines` array is kept as a
  // fallback for mock payloads.
  const legs = node?.transaction?.legs;
  const rawLines = node?.lines || (Array.isArray(legs) ? legs : legs?.edges?.map((edge) => edge?.node)) || [];
  const entryTags = {
    partyTag: mapEntryTag(node?.party),
    funderTag: mapEntryTag(node?.funder),
  };
  const lines = rawLines.filter(Boolean).map((line) => mapLedgerEntryLine(line, entryTags));
  return {
    id: decodeLedgerReferenceId(node.id),
    journal: node.journal,
    accountingPeriod: node.accountingPeriod
      ? {
          ...node.accountingPeriod,
          id: decodeLedgerReferenceId(node.accountingPeriod.id),
          status: mapPeriodStatus(node.accountingPeriod.status),
        }
      : node.accountingPeriod,
    sourceEventType: node.sourceEventType?.toLowerCase(),
    sourceEventReference: node.sourceEventReference,
    postedAt: node.postedAt,
    lines,
    totals: computeLedgerEntryTotals(lines),
  };
};

// The backend reports a rejected mutation as a GraphQL error (HTTP 200 with an
// `errors` array), while mock payloads/legacy backends return the messages in
// the mutation payload itself: accept both so the page can display the
// backend reason verbatim (FR-009).
const mutationErrorMessage = (mutationResult, payload) =>
  firstErrorMessage(mutationResult?.errors) ?? firstErrorMessage(payload?.errors);

// The backend exposes `operatingMode`/`externalSystem` as GraphQL enum NAMES
// (LOCAL_ONLY, ODOO, ...) on read but expects the raw stored values
// (local_only, odoo, ...) on write: normalize on ingest so the form always
// holds the value it must submit.
const OPERATING_MODE_BY_ENUM = {
  LOCAL_ONLY: "local_only",
  REPLICATED: "replicated",
  local_only: "local_only",
  replicated: "replicated",
};

const EXTERNAL_SYSTEM_BY_ENUM = {
  ODOO: "odoo",
  SAGE: "sage",
  odoo: "odoo",
  sage: "sage",
};

const mapDeploymentConfiguration = (configuration) => {
  if (!configuration) return configuration;
  return {
    ...configuration,
    operatingMode: OPERATING_MODE_BY_ENUM[configuration.operatingMode] ?? configuration.operatingMode,
    externalSystem: configuration.externalSystem
      ? EXTERNAL_SYSTEM_BY_ENUM[configuration.externalSystem] ?? configuration.externalSystem
      : null,
    retainedEarningsAccount: configuration.retainedEarningsAccount
      ? {
          ...configuration.retainedEarningsAccount,
          id: decodeLedgerReferenceId(configuration.retainedEarningsAccount.id),
        }
      : configuration.retainedEarningsAccount,
  };
};

const mapAccountOption = (node) => ({ ...node, id: decodeLedgerReferenceId(node?.id) });

// hordak stores `currencies` in a JSON field exposed as a GraphQL JSONString:
// normalize it to an array so the views can render it directly.
const mapAccountNode = (node) => ({
  ...mapAccountOption(node),
  currencies: parseCurrencies(node?.currencies),
});

// GraphQL answers with openIMIS base64 relay ids while mocks use readable ones
// (e.g. "uuid-1"): normalize both to the raw uuid, which is what the mutations
// expect (`journalUuid`/`accountUuid`, and `type` for the journal type).
const mapJournalNode = (journal) => ({
  ...journal,
  id: decodeLedgerReferenceId(journal?.id),
  type: journal?.type ? { ...journal.type, id: decodeLedgerReferenceId(journal.type.id) } : journal?.type,
});

// Mock review items use readable ids (e.g. "review-1"), while GraphQL
// responses use openIMIS base64 ids. Keep both forms valid in the reducer.
// The review queue is a paginated connection; the page reads a flattened
// view-model built from the replication record + its ledger entry.
const mapManualReviewItem = (node) => {
  const record = node?.replicationRecord || {};
  const entry = record.ledgerEntry || null;
  return {
    id: node?.id,
    status: record.status,
    targetSystem: record.targetSystem,
    rejectionReason: record.rejectionReason,
    externalReference: record.externalReference,
    createdAt: node?.createdAt,
    resolvedAt: node?.resolvedAt,
    resolutionNote: node?.resolutionNote,
    correctingEntryId: node?.resolvedByTransaction?.id || null,
    // Ids are decoded where the front-end compares them with `ledgerEntries`
    // items (both are decoded by the reducer) and kept encoded where they are
    // sent back to the backend as a filter/argument: `party` expects the
    // encoded AnalyticValue id, while `accountingPeriodId` is matched against
    // the decoded period list before being resolved to a period code.
    originalEntry: entry
      ? {
          id: decodeLedgerReferenceId(entry.id),
          postedAt: entry.postedAt,
          sourceEventType: entry.sourceEventType,
          sourceEventReference: entry.sourceEventReference,
          journal: entry.journal,
          accountingPeriod: entry.accountingPeriod
            ? { ...entry.accountingPeriod, id: decodeLedgerReferenceId(entry.accountingPeriod.id) }
            : entry.accountingPeriod,
          partyAnalyticValueId: entry.party?.id || null,
          accountingPeriodId: decodeLedgerReferenceId(entry.accountingPeriod?.id) || null,
          accountingPeriodCode: entry.accountingPeriod?.code || null,
        }
      : null,
  };
};

const mapConnectionPageInfo = (connection) => ({
  totalCount: connection?.totalCount ?? 0,
  hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
  hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
  startCursor: connection?.pageInfo?.startCursor ?? null,
  endCursor: connection?.pageInfo?.endCursor ?? null,
});

const mapAccountingPeriod = (period) =>
  period ? { ...period, id: decodeId(period.id), status: mapPeriodStatus(period.status) } : period;

// Shared by lock/close/reopen (US4): replaces the matching period in
// `accountingPeriods.items` with the mutation's returned period, or (if the
// backend rejected the transition) leaves items untouched and surfaces
// `errors[0].message` verbatim into `periodMutation.lastRejectionReason` (FR-009).
// Mock payloads (and legacy backends) still return the period/errors; the real
// backend only returns the mutation ids (the page then refetches the list), so
// both shapes are handled.
function applyPeriodTransitionResponse(state, mutationResult, service, action) {
  const withMutation = dispatchMutationResp(state, service, action);
  const rejectionReason = mutationErrorMessage(mutationResult, action.payload);
  if (rejectionReason) {
    return {
      ...withMutation,
      periodMutation: { submitting: false, error: rejectionReason, lastRejectionReason: rejectionReason },
    };
  }
  if (!mutationResult?.accountingPeriod) {
    return { ...withMutation, periodMutation: { submitting: false, error: null, lastRejectionReason: null } };
  }
  const updated = mapAccountingPeriod(mutationResult.accountingPeriod);
  return {
    ...withMutation,
    periodMutation: { submitting: false, error: null, lastRejectionReason: null },
    accountingPeriods: {
      ...state.accountingPeriods,
      items: state.accountingPeriods.items.map((p) => (p.id === updated?.id ? { ...p, ...updated } : p)),
    },
  };
}

function reducer(state = initialState, action) {
  switch (action.type) {
    // --- User Story 1: General Ledger Browser --------------------------
    case req(ACTION_TYPE.LEDGER_ENTRIES):
      return {
        ...state,
        ledgerEntries: {
          ...state.ledgerEntries,
          isFetching: true,
          isFetched: false,
          error: null,
          filters: action.meta?.filters || state.ledgerEntries.filters,
        },
      };
    case resp(ACTION_TYPE.LEDGER_ENTRIES): {
      const connection = action.payload?.data?.ledgerEntries;
      const items = sortLedgerEntries(
        (connection?.edges || [])
          .map((edge) => edge?.node)
          .filter(Boolean)
          .map(mapLedgerEntryNode),
        action.meta?.orderBy,
      );
      return {
        ...state,
        ledgerEntries: {
          ...state.ledgerEntries,
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          items,
          pageInfo: {
            totalCount: connection?.totalCount ?? 0,
            hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
            hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
            startCursor: connection?.pageInfo?.startCursor ?? null,
            endCursor: connection?.pageInfo?.endCursor ?? null,
          },
        },
      };
    }
    case err(ACTION_TYPE.LEDGER_ENTRIES):
      return {
        ...state,
        ledgerEntries: {
          ...state.ledgerEntries,
          isFetching: false,
          isFetched: false,
          error: formatServerError(action.payload),
        },
      };

    // --- Foundational: Accounting Periods (read side, shared by US1/US2/US4/US6) ---
    case req(ACTION_TYPE.ACCOUNTING_PERIODS):
      return {
        ...state,
        accountingPeriods: { ...state.accountingPeriods, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.ACCOUNTING_PERIODS): {
      const items = (action.payload?.data?.accountingPeriods?.edges || []).map((edge) =>
        mapAccountingPeriod(edge?.node),
      );
      return {
        ...state,
        accountingPeriods: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          items,
        },
      };
    }
    case err(ACTION_TYPE.ACCOUNTING_PERIODS):
      return {
        ...state,
        accountingPeriods: { ...state.accountingPeriods, isFetching: false, error: formatServerError(action.payload) },
      };

    // --- User Story 2: Party Sub-Ledger ---------------------------------
    case req(ACTION_TYPE.PARTY_SEARCH):
      return { ...state, partySearch: { ...state.partySearch, isFetching: true, isFetched: false, error: null } };
    case resp(ACTION_TYPE.PARTY_SEARCH):
      return {
        ...state,
        partySearch: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          results: (action.payload?.data?.analyticValue?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map((node) => ({
              ...node,
              analyticValueId: node.id,
              id: decodeId(node.id),
              partyType: node.partyType?.toLowerCase(),
            })),
        },
      };
    case err(ACTION_TYPE.PARTY_SEARCH):
      return {
        ...state,
        partySearch: { ...state.partySearch, isFetching: false, error: formatServerError(action.payload) },
      };

    case ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET:
      return {
        ...state,
        partyLedgerBalance: {
          isFetching: false,
          isFetched: false,
          error: null,
          items: [],
          pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        },
      };

    case req(ACTION_TYPE.PARTY_LEDGER_BALANCE):
      return {
        ...state,
        partyLedgerBalance: { ...state.partyLedgerBalance, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.PARTY_LEDGER_BALANCE): {
      const connection = action.payload?.data?.partyLedgerBalance;
      return {
        ...state,
        partyLedgerBalance: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          items: (connection?.edges || []).map((edge) => edge?.node).filter(Boolean),
          pageInfo: mapConnectionPageInfo(connection),
        },
      };
    }
    case err(ACTION_TYPE.PARTY_LEDGER_BALANCE):
      return {
        ...state,
        partyLedgerBalance: {
          ...state.partyLedgerBalance,
          isFetching: false,
          error: formatServerError(action.payload),
        },
      };

    // --- User Story 3: Funder Activity -----------------------------------
    case req(ACTION_TYPE.FUNDER_SEARCH):
      return { ...state, funderSearch: { ...state.funderSearch, isFetching: true, isFetched: false, error: null } };
    case resp(ACTION_TYPE.FUNDER_SEARCH):
      return {
        ...state,
        funderSearch: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          results: (action.payload?.data?.analyticValue?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map((node) => ({
              ...node,
              analyticValueId: node.id,
              id: decodeId(node.id),
              partyType: node.partyType?.toLowerCase(),
            })),
        },
      };
    case err(ACTION_TYPE.FUNDER_SEARCH):
      return {
        ...state,
        funderSearch: { ...state.funderSearch, isFetching: false, error: formatServerError(action.payload) },
      };

    case req(ACTION_TYPE.JOURNAL_SEARCH):
      return { ...state, journalSearch: { ...state.journalSearch, isFetching: true, isFetched: false, error: null } };
    case resp(ACTION_TYPE.JOURNAL_SEARCH):
      return {
        ...state,
        journalSearch: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          results: (action.payload?.data?.ledgerJournal?.edges || []).map((edge) => edge?.node).filter(Boolean),
          fetchedType: action.meta?.journalType ?? null,
        },
      };
    case err(ACTION_TYPE.JOURNAL_SEARCH):
      return {
        ...state,
        journalSearch: { ...state.journalSearch, isFetching: false, error: formatServerError(action.payload) },
      };

    case req(ACTION_TYPE.FUNDER_ACTIVITY_REPORT):
      return {
        ...state,
        funderActivityReport: { ...state.funderActivityReport, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.FUNDER_ACTIVITY_REPORT):
      return {
        ...state,
        funderActivityReport: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          data: action.payload?.data?.funderActivityReport || null,
        },
      };
    case err(ACTION_TYPE.FUNDER_ACTIVITY_REPORT):
      return {
        ...state,
        funderActivityReport: {
          ...state.funderActivityReport,
          isFetching: false,
          error: formatServerError(action.payload),
        },
      };

    // --- User Story 4: Accounting Periods lifecycle -----------------------
    case req(ACTION_TYPE.OPEN_ACCOUNTING_PERIOD):
      return {
        ...dispatchMutationReq(state, action),
        periodMutation: { submitting: true, error: null, lastRejectionReason: null },
      };
    case resp(ACTION_TYPE.OPEN_ACCOUNTING_PERIOD): {
      const result = action.payload?.data?.openAccountingPeriod;
      const withMutation = dispatchMutationResp(state, "openAccountingPeriod", action);
      const rejectionReason = mutationErrorMessage(result, action.payload);
      if (rejectionReason) {
        return {
          ...withMutation,
          periodMutation: { submitting: false, error: rejectionReason, lastRejectionReason: rejectionReason },
        };
      }
      if (!result?.accountingPeriod) {
        return { ...withMutation, periodMutation: { submitting: false, error: null, lastRejectionReason: null } };
      }
      const created = mapAccountingPeriod(result.accountingPeriod);
      return {
        ...withMutation,
        periodMutation: { submitting: false, error: null, lastRejectionReason: null },
        accountingPeriods: { ...state.accountingPeriods, items: [...state.accountingPeriods.items, created] },
      };
    }
    case err(ACTION_TYPE.OPEN_ACCOUNTING_PERIOD):
      return {
        ...state,
        periodMutation: {
          submitting: false,
          error: formatServerError(action.payload)?.message ?? null,
          lastRejectionReason: null,
        },
      };

    case req(ACTION_TYPE.LOCK_ACCOUNTING_PERIOD):
    case req(ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD):
    case req(ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD):
      return {
        ...dispatchMutationReq(state, action),
        periodMutation: { submitting: true, error: null, lastRejectionReason: null },
      };

    case resp(ACTION_TYPE.LOCK_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(
        state,
        action.payload?.data?.lockAccountingPeriod,
        "lockAccountingPeriod",
        action,
      );
    case resp(ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(
        state,
        action.payload?.data?.closeAccountingPeriod,
        "closeAccountingPeriod",
        action,
      );
    case resp(ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(
        state,
        action.payload?.data?.reopenAccountingPeriod,
        "reopenAccountingPeriod",
        action,
      );

    case err(ACTION_TYPE.LOCK_ACCOUNTING_PERIOD):
    case err(ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD):
    case err(ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD):
      return {
        ...dispatchMutationErr(state, action),
        periodMutation: {
          submitting: false,
          error: formatServerError(action.payload)?.message ?? null,
          lastRejectionReason: null,
        },
      };

    // --- User Story 5: Manual Review Queue --------------------------------
    case req(ACTION_TYPE.MANUAL_REVIEW_QUEUE):
      return {
        ...state,
        manualReviewQueue: { ...state.manualReviewQueue, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.MANUAL_REVIEW_QUEUE): {
      const connection = action.payload?.data?.manualReviewQueue;
      return {
        ...state,
        manualReviewQueue: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          items: (connection?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map(mapManualReviewItem),
          pageInfo: mapConnectionPageInfo(connection),
        },
      };
    }
    case err(ACTION_TYPE.MANUAL_REVIEW_QUEUE):
      return {
        ...state,
        manualReviewQueue: { ...state.manualReviewQueue, isFetching: false, error: formatServerError(action.payload) },
      };

    case req(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM):
      return {
        ...dispatchMutationReq(state, action),
        reviewResolution: { submitting: true, error: null },
      };
    case resp(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM): {
      const result = action.payload?.data?.resolveManualReviewItem;
      const withMutation = dispatchMutationResp(state, "resolveManualReview", action);
      const message = mutationErrorMessage(result, action.payload);
      if (message) {
        return { ...withMutation, reviewResolution: { submitting: false, error: message } };
      }
      const updatedNode = result?.manualReviewQueueItem;
      if (!updatedNode) {
        return { ...withMutation, reviewResolution: { submitting: false, error: null } };
      }
      // The backend answers with the GraphQL node (nested `replicationRecord`):
      // map it like the queue query does, otherwise the raw field names would
      // overwrite the view-model (`correctingEntryId`, decoded period ids...).
      // Mock/legacy payloads already carry the mapped shape and are kept as-is.
      const updated = updatedNode.replicationRecord ? mapManualReviewItem(updatedNode) : updatedNode;
      return {
        ...withMutation,
        reviewResolution: { submitting: false, error: null },
        manualReviewQueue: {
          ...state.manualReviewQueue,
          items: state.manualReviewQueue.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        },
      };
    }
    case err(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM):
      return {
        ...dispatchMutationErr(state, action),
        reviewResolution: { submitting: false, error: formatServerError(action.payload)?.message ?? null },
      };

    // --- User Story 6: Period Export ---------------------------------------
    case req(ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD):
      return { ...dispatchMutationReq(state, action), exportJobs: { ...state.exportJobs, error: null } };
    case resp(ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD): {
      const result = action.payload?.data?.exportAccountingPeriod;
      const job = result?.exportJob;
      const withMutation = dispatchMutationResp(state, "exportAccountingPeriod", action);
      if (!job) return withMutation;
      return {
        ...withMutation,
        exportJobs: {
          ...withMutation.exportJobs,
          error: null,
          byPeriodId: { ...withMutation.exportJobs.byPeriodId, [job.accountingPeriodId]: job },
        },
      };
    }
    case resp(ACTION_TYPE.EXPORT_SEQUENCES): {
      const job = action.payload?.data?.exportSequences;
      if (!job) return state;
      return {
        ...state,
        exportJobs: {
          ...state.exportJobs,
          error: null,
          byPeriodId: { ...state.exportJobs.byPeriodId, [job.accountingPeriodId]: job },
        },
      };
    }
    case err(ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD):
      return {
        ...dispatchMutationErr(state, action),
        exportJobs: { ...state.exportJobs, error: formatServerError(action.payload)?.message ?? null },
      };
    case err(ACTION_TYPE.EXPORT_SEQUENCES):
      return {
        ...state,
        exportJobs: { ...state.exportJobs, error: formatServerError(action.payload)?.message ?? null },
      };

    // --- Ticket 37991: Accounts management --------------------------------
    case req(ACTION_TYPE.ACCOUNTS):
      return {
        ...state,
        accounts: { ...state.accounts, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.ACCOUNTS): {
      const connection = action.payload?.data?.accounts;
      return {
        ...state,
        accounts: {
          isFetching: false,
          isFetched: true,
          error: graphqlErrorMessage(action.payload),
          items: (connection?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map(mapAccountNode),
          pageInfo: {
            totalCount: connection?.totalCount ?? 0,
            hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
            hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
            startCursor: connection?.pageInfo?.startCursor ?? null,
            endCursor: connection?.pageInfo?.endCursor ?? null,
          },
        },
      };
    }
    case err(ACTION_TYPE.ACCOUNTS):
      return {
        ...state,
        accounts: { ...state.accounts, isFetching: false, error: formatServerError(action.payload)?.message ?? null },
      };

    case req(ACTION_TYPE.CREATE_ACCOUNT):
    case req(ACTION_TYPE.UPDATE_ACCOUNT):
    case req(ACTION_TYPE.DELETE_ACCOUNT):
      return {
        ...dispatchMutationReq(state, action),
        accountMutation: { ...state.accountMutation, submitting: true, error: null },
      };
    case resp(ACTION_TYPE.CREATE_ACCOUNT):
    case resp(ACTION_TYPE.UPDATE_ACCOUNT):
    case resp(ACTION_TYPE.DELETE_ACCOUNT): {
      const result =
        action.payload?.data?.createAccount ??
        action.payload?.data?.updateAccount ??
        action.payload?.data?.deleteAccount;
      // A GraphQL error leaves the payload field null/absent: without a result
      // the mutation cannot be considered answered, let alone successful.
      const message = mutationErrorMessage(result, action.payload);
      if (!result || message) {
        return {
          ...state,
          accountMutation: {
            ...state.accountMutation,
            submitting: false,
            error: message ?? "The mutation could not be verified, please check the list before retrying.",
          },
        };
      }
      return {
        ...dispatchMutationResp(state, serviceFor(ACCOUNT_MUTATION_SERVICES, action.type), action),
        accountMutation: { ...state.accountMutation, submitting: false, error: null },
      };
    }
    case `${ACTION_TYPE.CREATE_ACCOUNT}_CONFIRMED`:
    case `${ACTION_TYPE.UPDATE_ACCOUNT}_CONFIRMED`:
    case `${ACTION_TYPE.DELETE_ACCOUNT}_CONFIRMED`:
      return {
        ...state,
        accountMutation: { submitting: false, error: null, lastMutationAt: Date.now() },
      };
    case err(ACTION_TYPE.CREATE_ACCOUNT):
    case err(ACTION_TYPE.UPDATE_ACCOUNT):
    case err(ACTION_TYPE.DELETE_ACCOUNT):
      return {
        ...dispatchMutationErr(state, action),
        accountMutation: {
          ...state.accountMutation,
          submitting: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    // --- Ticket 37990: Journals management --------------------------------
    case req(ACTION_TYPE.JOURNALS):
      return {
        ...state,
        journals: { ...state.journals, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.JOURNALS): {
      const connection = action.payload?.data?.ledgerJournal;
      return {
        ...state,
        journals: {
          isFetching: false,
          isFetched: true,
          error: graphqlErrorMessage(action.payload),
          // `isDeleted` is filtered client-side as a safety net: the backend
          // soft-deletes journals and its query does not filter them yet.
          items: (connection?.edges || [])
            .map((edge) => edge?.node)
            .filter((journal) => journal && journal.isDeleted !== true)
            .map(mapJournalNode),
          pageInfo: {
            totalCount: connection?.totalCount ?? 0,
            hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
            hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
            startCursor: connection?.pageInfo?.startCursor ?? null,
            endCursor: connection?.pageInfo?.endCursor ?? null,
          },
        },
      };
    }
    case err(ACTION_TYPE.JOURNALS):
      return {
        ...state,
        journals: { ...state.journals, isFetching: false, error: formatServerError(action.payload)?.message ?? null },
      };

    case req(ACTION_TYPE.JOURNAL_TYPES):
      return {
        ...state,
        journalTypes: { ...state.journalTypes, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.JOURNAL_TYPES): {
      const connection = action.payload?.data?.journalTypes;
      return {
        ...state,
        journalTypes: {
          isFetching: false,
          isFetched: true,
          error: graphqlErrorMessage(action.payload),
          // The mutation input expects the JournalTypes uuid: decode the relay
          // id once, here, so pickers can submit `id` directly.
          items: (connection?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map((node) => ({
              ...node,
              id: decodeLedgerReferenceId(node?.id),
            })),
        },
      };
    }
    case err(ACTION_TYPE.JOURNAL_TYPES):
      return {
        ...state,
        journalTypes: {
          ...state.journalTypes,
          isFetching: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    // Creation, edition and deletion share the same lifecycle. `_RESP` only
    // means "the HTTP round-trip is over": the backend answers with a success
    // payload even when the write was rejected, so the success stamp
    // (`lastMutationAt`, which closes the form and refreshes the list) is set by
    // `_CONFIRMED`, dispatched once `mutationLogs` confirms the mutation.
    case req(ACTION_TYPE.CREATE_JOURNAL):
    case req(ACTION_TYPE.UPDATE_JOURNAL):
    case req(ACTION_TYPE.DELETE_JOURNAL):
      return {
        ...dispatchMutationReq(state, action),
        journalMutation: { ...state.journalMutation, submitting: true, error: null },
      };
    case resp(ACTION_TYPE.CREATE_JOURNAL):
    case resp(ACTION_TYPE.UPDATE_JOURNAL):
    case resp(ACTION_TYPE.DELETE_JOURNAL): {
      const result =
        action.payload?.data?.createJournal ??
        action.payload?.data?.updateJournal ??
        action.payload?.data?.deleteJournal;
      // A GraphQL error leaves the payload field null/absent: without a result
      // the mutation cannot be considered answered, let alone successful.
      const message = mutationErrorMessage(result, action.payload);
      if (!result || message) {
        return {
          ...state,
          journalMutation: {
            ...state.journalMutation,
            submitting: false,
            error: message ?? "The mutation could not be verified, please check the list before retrying.",
          },
        };
      }
      return {
        ...dispatchMutationResp(state, serviceFor(JOURNAL_MUTATION_SERVICES, action.type), action),
        journalMutation: { ...state.journalMutation, submitting: false, error: null },
      };
    }
    case `${ACTION_TYPE.CREATE_JOURNAL}_CONFIRMED`:
    case `${ACTION_TYPE.UPDATE_JOURNAL}_CONFIRMED`:
    case `${ACTION_TYPE.DELETE_JOURNAL}_CONFIRMED`:
      return {
        ...state,
        journalMutation: { submitting: false, error: null, lastMutationAt: Date.now() },
      };
    case err(ACTION_TYPE.CREATE_JOURNAL):
    case err(ACTION_TYPE.UPDATE_JOURNAL):
    case err(ACTION_TYPE.DELETE_JOURNAL):
      return {
        ...dispatchMutationErr(state, action),
        journalMutation: {
          ...state.journalMutation,
          submitting: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    // --- User Story 7: Deployment Configuration ----------------------------
    case req(ACTION_TYPE.DEPLOYMENT_CONFIGURATION):
      return {
        ...state,
        deploymentConfiguration: { ...state.deploymentConfiguration, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.DEPLOYMENT_CONFIGURATION): {
      const connection = action.payload?.data?.deploymentConfiguration;
      const gqlError = graphqlErrorMessage(action.payload);
      const node = connection?.edges?.[0]?.node ?? null;
      return {
        ...state,
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          isFetching: false,
          isFetched: true,
          error: gqlError,
          data: mapDeploymentConfiguration(node),
        },
      };
    }
    case err(ACTION_TYPE.DEPLOYMENT_CONFIGURATION):
      return {
        ...state,
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          isFetching: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    // Foundational: chart of accounts shared by every account picker.
    case req(ACTION_TYPE.ACCOUNT_OPTIONS):
      return { ...state, accountOptions: { ...state.accountOptions, isFetching: true, isFetched: false, error: null } };
    case resp(ACTION_TYPE.ACCOUNT_OPTIONS):
      return {
        ...state,
        accountOptions: {
          isFetching: false,
          isFetched: true,
          error: graphqlErrorMessage(action.payload),
          items: (action.payload?.data?.accounts?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean)
            .map(mapAccountOption),
        },
      };
    case err(ACTION_TYPE.ACCOUNT_OPTIONS):
      return {
        ...state,
        accountOptions: {
          ...state.accountOptions,
          isFetching: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    case req(ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION):
      return {
        ...dispatchMutationReq(state, action),
        deploymentConfiguration: { ...state.deploymentConfiguration, submitting: true, error: null },
      };
    case resp(ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION): {
      // createDeploymentConfiguration only answers with the mutation ids: the
      // submitted values (echoed through the action meta) become the current
      // configuration until the next read.
      const message = firstErrorMessage(action.payload?.data?.createDeploymentConfiguration?.errors);
      if (message) {
        return {
          ...state,
          deploymentConfiguration: { ...state.deploymentConfiguration, submitting: false, error: message },
        };
      }
      const submitted = action.meta?.deploymentConfiguration;
      return {
        ...dispatchMutationResp(state, "createDeploymentConfiguration", action),
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          submitting: false,
          error: null,
          data: submitted ? mapDeploymentConfiguration(submitted) : state.deploymentConfiguration.data,
        },
      };
    }
    case err(ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION):
      return {
        ...dispatchMutationErr(state, action),
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          submitting: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    default:
      return state;
  }
}

export { initialState };
export default reducer;
