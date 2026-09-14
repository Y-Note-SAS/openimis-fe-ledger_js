import { formatServerError, formatGraphQLError, decodeId } from "@openimis/fe-core";
import { computeLedgerEntryTotals } from "./utils/ledgerEntryTotals";
import { parseCurrencies } from "./utils/currencies";
import { firstErrorMessage } from "./utils/graphqlErrors";

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
  partyLedgerBalance: { isFetching: false, isFetched: false, error: null, data: null },

  funderSearch: { isFetching: false, isFetched: false, error: null, results: [] },
  funderActivityReport: { isFetching: false, isFetched: false, error: null, data: null },

  journalSearch: { isFetching: false, isFetched: false, error: null, results: [], fetchedType: null },

  accountingPeriods: { isFetching: false, isFetched: false, error: null, items: [] },
  periodMutation: { submitting: false, error: null, lastRejectionReason: null },

  manualReviewQueue: { isFetching: false, isFetched: false, error: null, items: [] },
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
  accountMutation: { submitting: false, error: null, lastCreatedAt: null },
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

const mapLedgerEntryLine = (line) => ({
  id: decodeLedgerReferenceId(line.id),
  account: line.account,
  debit: line.debit,
  credit: line.credit,
  partyTag: line.partyTag || mapAnalyticTag(line.analyticTags, "party"),
  funderTag: line.funderTag || mapAnalyticTag(line.analyticTags, "funder"),
});

const mapLedgerEntryNode = (node) => {
  // The backend returns the legs as a Relay connection
  // (`transaction.legs.edges[].node`); the flat `lines` array is kept as a
  // fallback for mock payloads.
  const legs = node?.transaction?.legs;
  const rawLines =
    node?.lines || (Array.isArray(legs) ? legs : legs?.edges?.map((edge) => edge?.node)) || [];
  const lines = rawLines.filter(Boolean).map(mapLedgerEntryLine);
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

// Mock review items use readable ids (e.g. "review-1"), while GraphQL
// responses use openIMIS base64 ids. Keep both forms valid in the reducer.
const decodeManualReviewId = (id) => {
  if (id === null || id === undefined) return id;
  try {
    return decodeId(id);
  } catch {
    return id;
  }
};

const mapAccountingPeriod = (period) =>
  period ? { ...period, id: decodeId(period.id), status: mapPeriodStatus(period.status) } : period;

// Shared by lock/close/reopen (US4): replaces the matching period in
// `accountingPeriods.items` with the mutation's returned period, or (if the
// backend rejected the transition) leaves items untouched and surfaces
// `errors[0].message` verbatim into `periodMutation.lastRejectionReason` (FR-009).
function applyPeriodTransitionResponse(state, mutationResult) {
  const errors = mutationResult?.errors;
  const rejectionReason = firstErrorMessage(errors);
  if (rejectionReason) {
    return {
      ...state,
      periodMutation: { submitting: false, error: rejectionReason, lastRejectionReason: rejectionReason },
    };
  }
  const updated = mapAccountingPeriod(mutationResult?.accountingPeriod);
  return {
    ...state,
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
      const items = (connection?.edges || []).map((edge) => mapLedgerEntryNode(edge.node));
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
        mapAccountingPeriod(edge.node),
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
          results: (action.payload?.data?.analyticValue?.edges || []).map((edge) => {
            const node = edge.node;
            return {
              ...node,
              analyticValueId: node.id,
              id: decodeId(node.id),
              partyType: node.partyType?.toLowerCase(),
            };
          }),
        },
      };
    case err(ACTION_TYPE.PARTY_SEARCH):
      return { ...state, partySearch: { ...state.partySearch, isFetching: false, error: formatServerError(action.payload) } };

    case ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET:
      return {
        ...state,
        partyLedgerBalance: { isFetching: false, isFetched: false, error: null, data: null },
      };

    case req(ACTION_TYPE.PARTY_LEDGER_BALANCE):
      return {
        ...state,
        partyLedgerBalance: { ...state.partyLedgerBalance, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.PARTY_LEDGER_BALANCE): {
      const raw = action.payload?.data?.partyLedgerBalance;
      const data = raw && {
        ...raw,
        transactions: (raw.transactions || []).map(mapLedgerEntryNode),
      };
      return {
        ...state,
        partyLedgerBalance: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          data,
        },
      };
    }
    case err(ACTION_TYPE.PARTY_LEDGER_BALANCE):
      return {
        ...state,
        partyLedgerBalance: { ...state.partyLedgerBalance, isFetching: false, error: formatServerError(action.payload) },
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
          results: (action.payload?.data?.analyticValue?.edges || []).map((edge) => {
            const node = edge.node;
            return {
              ...node,
              analyticValueId: node.id,
              id: decodeId(node.id),
              partyType: node.partyType?.toLowerCase(),
            };
          }),
        },
      };
    case err(ACTION_TYPE.FUNDER_SEARCH):
      return { ...state, funderSearch: { ...state.funderSearch, isFetching: false, error: formatServerError(action.payload) } };

    case req(ACTION_TYPE.JOURNAL_SEARCH):
      return { ...state, journalSearch: { ...state.journalSearch, isFetching: true, isFetched: false, error: null } };
    case resp(ACTION_TYPE.JOURNAL_SEARCH):
      return {
        ...state,
        journalSearch: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          results: (action.payload?.data?.ledgerJournal?.edges || [])
            .map((edge) => edge?.node)
            .filter(Boolean),
          fetchedType: action.meta?.journalType ?? null,
        },
      };
    case err(ACTION_TYPE.JOURNAL_SEARCH):
      return { ...state, journalSearch: { ...state.journalSearch, isFetching: false, error: formatServerError(action.payload) } };

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
        funderActivityReport: { ...state.funderActivityReport, isFetching: false, error: formatServerError(action.payload) },
      };

    // --- User Story 4: Accounting Periods lifecycle -----------------------
    case req(ACTION_TYPE.OPEN_ACCOUNTING_PERIOD):
      return { ...state, periodMutation: { submitting: true, error: null, lastRejectionReason: null } };
    case resp(ACTION_TYPE.OPEN_ACCOUNTING_PERIOD): {
      const result = action.payload?.data?.openAccountingPeriod;
      const rejectionReason = firstErrorMessage(result?.errors);
      if (rejectionReason) {
        return {
          ...state,
          periodMutation: { submitting: false, error: rejectionReason, lastRejectionReason: rejectionReason },
        };
      }
      const created = mapAccountingPeriod(result?.accountingPeriod);
      return {
        ...state,
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
      return { ...state, periodMutation: { submitting: true, error: null, lastRejectionReason: null } };

    case resp(ACTION_TYPE.LOCK_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(state, action.payload?.data?.lockAccountingPeriod);
    case resp(ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(state, action.payload?.data?.closeAccountingPeriod);
    case resp(ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD):
      return applyPeriodTransitionResponse(state, action.payload?.data?.reopenAccountingPeriod);

    case err(ACTION_TYPE.LOCK_ACCOUNTING_PERIOD):
    case err(ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD):
    case err(ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD):
      return {
        ...state,
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
    case resp(ACTION_TYPE.MANUAL_REVIEW_QUEUE):
      return {
        ...state,
        manualReviewQueue: {
          isFetching: false,
          isFetched: true,
          error: formatGraphQLError(action.payload),
          items: (action.payload?.data?.manualReviewQueue || []).map((item) => ({
            ...item,
            id: decodeManualReviewId(item.id),
          })),
        },
      };
    case err(ACTION_TYPE.MANUAL_REVIEW_QUEUE):
      return {
        ...state,
        manualReviewQueue: { ...state.manualReviewQueue, isFetching: false, error: formatServerError(action.payload) },
      };

    case req(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM):
      return { ...state, reviewResolution: { submitting: true, error: null } };
    case resp(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM): {
      const result = action.payload?.data?.resolveManualReviewItem;
      const message = firstErrorMessage(result?.errors);
      if (message) {
        return { ...state, reviewResolution: { submitting: false, error: message } };
      }
      const updated = result?.manualReviewQueueItem;
      return {
        ...state,
        reviewResolution: { submitting: false, error: null },
        manualReviewQueue: {
          ...state.manualReviewQueue,
          items: state.manualReviewQueue.items.map((item) =>
            item.id === decodeManualReviewId(updated?.id)
              ? { ...item, ...updated, id: decodeManualReviewId(updated.id) }
              : item,
          ),
        },
      };
    }
    case err(ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM):
      return { ...state, reviewResolution: { submitting: false, error: formatServerError(action.payload)?.message ?? null } };

    // --- User Story 6: Period Export ---------------------------------------
    case resp(ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD): {
      const result = action.payload?.data?.exportAccountingPeriod;
      const job = result?.exportJob;
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
    case err(ACTION_TYPE.EXPORT_SEQUENCES):
      return { ...state, exportJobs: { ...state.exportJobs, error: formatServerError(action.payload)?.message ?? null } };

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
          error: formatGraphQLError(action.payload)?.message ?? null,
          items: (connection?.edges || []).map((edge) => mapAccountNode(edge.node)),
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
        accounts: {
          ...state.accounts,
          isFetching: false,
          error: formatServerError(action.payload)?.message ?? null,
        },
      };

    case req(ACTION_TYPE.CREATE_ACCOUNT):
      return { ...state, accountMutation: { ...state.accountMutation, submitting: true, error: null } };
    case resp(ACTION_TYPE.CREATE_ACCOUNT): {
      const result = action.payload?.data?.createAccount;
      const message = firstErrorMessage(result?.errors);
      if (message) {
        return { ...state, accountMutation: { ...state.accountMutation, submitting: false, error: message } };
      }
      // The mutation only answers with the mutation ids: the page refreshes the
      // paginated list (and resets the creation form) on `lastCreatedAt`.
      return {
        ...state,
        accountMutation: { submitting: false, error: null, lastCreatedAt: Date.now() },
      };
    }
    case err(ACTION_TYPE.CREATE_ACCOUNT):
      return {
        ...state,
        accountMutation: {
          ...state.accountMutation,
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
      const gqlError = formatGraphQLError(action.payload)?.message ?? null;
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
          error: formatGraphQLError(action.payload)?.message ?? null,
          items: (action.payload?.data?.accounts?.edges || []).map((edge) => mapAccountOption(edge.node)),
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
      return { ...state, deploymentConfiguration: { ...state.deploymentConfiguration, submitting: true, error: null } };
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
        ...state,
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
        ...state,
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
