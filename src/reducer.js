import { formatServerError, formatGraphQLError, decodeId } from "@openimis/fe-core";
import { computeLedgerEntryTotals } from "./utils/ledgerEntryTotals";

// Flux Standard Action triplet suffixes, consistent with every other
// openimis-fe-* module in this environment (research.md §1).
export const ACTION_TYPE = {
  LEDGER_ENTRIES: "LEDGER_LEDGER_ENTRIES",
  ACCOUNTING_PERIODS: "LEDGER_ACCOUNTING_PERIODS",
  PARTY_SEARCH: "LEDGER_PARTY_SEARCH",
  PARTY_LEDGER_BALANCE: "LEDGER_PARTY_LEDGER_BALANCE",
  PARTY_LEDGER_BALANCE_RESET: "LEDGER_PARTY_LEDGER_BALANCE_RESET",
  FUNDER_SEARCH: "LEDGER_FUNDER_SEARCH",
  FUNDER_ACTIVITY_REPORT: "LEDGER_FUNDER_ACTIVITY_REPORT",
  MANUAL_REVIEW_QUEUE: "LEDGER_MANUAL_REVIEW_QUEUE",
  DEPLOYMENT_CONFIGURATION: "LEDGER_DEPLOYMENT_CONFIGURATION",
  EXTERNAL_SYSTEMS: "LEDGER_EXTERNAL_SYSTEMS",
  CURRENCY_CODES: "LEDGER_CURRENCY_CODES",
  CHART_OF_ACCOUNTS: "LEDGER_CHART_OF_ACCOUNTS",

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

  accountingPeriods: { isFetching: false, isFetched: false, error: null, items: [] },
  periodMutation: { submitting: false, error: null, lastRejectionReason: null },

  manualReviewQueue: { isFetching: false, isFetched: false, error: null, items: [] },
  reviewResolution: { submitting: false, error: null },

  exportJobs: { byPeriodId: {} },

  deploymentConfiguration: { isFetching: false, isFetched: false, error: null, data: null, submitting: false },

  externalSystems: { isFetching: false, isFetched: false, error: null, items: [] },
  currencyCodes: { isFetching: false, isFetched: false, error: null, items: [] },
  chartOfAccounts: { isFetching: false, isFetched: false, error: null, items: [] },
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

const mapLedgerEntryNode = (node) => {
  const lines = (node?.lines || []).map((line) => ({
    id: decodeLedgerReferenceId(line.id),
    account: line.account,
    debit: line.debit,
    credit: line.credit,
    partyTag: line.partyTag,
    funderTag: line.funderTag,
  }));
  return {
    id: decodeLedgerReferenceId(node.id),
    journal: node.journal,
    accountingPeriod: node.accountingPeriod
      ? { ...node.accountingPeriod, id: decodeLedgerReferenceId(node.accountingPeriod.id) }
      : node.accountingPeriod,
    sourceEventType: node.sourceEventType,
    sourceEventReference: node.sourceEventReference,
    postedAt: node.postedAt,
    lines,
    totals: computeLedgerEntryTotals(lines),
  };
};

const firstErrorMessage = (errors) => (errors && errors.length ? errors[0].message : null);

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

const mapAccountingPeriod = (period) => (period ? { ...period, id: decodeId(period.id) } : period);

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
      const items = (action.payload?.data?.accountingPeriods || []).map((period) => ({
        ...period,
        id: decodeId(period.id),
      }));
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
          results: (action.payload?.data?.analyticValues || []).map((r) => ({ ...r, id: decodeId(r.analyticValueId) })),
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
          results: (action.payload?.data?.analyticValues || []).map((r) => ({ ...r, id: decodeId(r.analyticValueId) })),
        },
      };
    case err(ACTION_TYPE.FUNDER_SEARCH):
      return { ...state, funderSearch: { ...state.funderSearch, isFetching: false, error: formatServerError(action.payload) } };

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
        exportJobs: { byPeriodId: { ...state.exportJobs.byPeriodId, [job.accountingPeriodId]: job } },
      };
    }
    case resp(ACTION_TYPE.EXPORT_SEQUENCES): {
      const job = action.payload?.data?.exportSequences;
      if (!job) return state;
      return {
        ...state,
        exportJobs: { byPeriodId: { ...state.exportJobs.byPeriodId, [job.accountingPeriodId]: job } },
      };
    }

    // --- User Story 7: Deployment Configuration ----------------------------
    case req(ACTION_TYPE.DEPLOYMENT_CONFIGURATION):
      return {
        ...state,
        deploymentConfiguration: { ...state.deploymentConfiguration, isFetching: true, isFetched: false, error: null },
        externalSystems: { ...state.externalSystems, isFetching: true, isFetched: false, error: null },
        currencyCodes: { ...state.currencyCodes, isFetching: true, isFetched: false, error: null },
        chartOfAccounts: { ...state.chartOfAccounts, isFetching: true, isFetched: false, error: null },
      };
    case resp(ACTION_TYPE.DEPLOYMENT_CONFIGURATION): {
      const data = action.payload?.data;
      const gqlError = formatGraphQLError(action.payload);
      return {
        ...state,
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          isFetching: false,
          isFetched: true,
          error: gqlError,
          data: data?.deploymentConfiguration || null,
        },
        externalSystems: { isFetching: false, isFetched: true, error: gqlError, items: data?.externalSystems || [] },
        currencyCodes: { isFetching: false, isFetched: true, error: gqlError, items: data?.currencyCodes || [] },
        chartOfAccounts: {
          isFetching: false,
          isFetched: true,
          error: gqlError,
          items: (data?.chartOfAccounts || []).map((a) => ({ ...a, id: decodeId(a.id) })),
        },
      };
    }
    case err(ACTION_TYPE.DEPLOYMENT_CONFIGURATION): {
      const serverError = formatServerError(action.payload);
      return {
        ...state,
        deploymentConfiguration: { ...state.deploymentConfiguration, isFetching: false, error: serverError },
        externalSystems: { ...state.externalSystems, isFetching: false, error: serverError },
        currencyCodes: { ...state.currencyCodes, isFetching: false, error: serverError },
        chartOfAccounts: { ...state.chartOfAccounts, isFetching: false, error: serverError },
      };
    }

    case req(ACTION_TYPE.CONFIGURE_DEPLOYMENT):
      return { ...state, deploymentConfiguration: { ...state.deploymentConfiguration, submitting: true, error: null } };
    case resp(ACTION_TYPE.CONFIGURE_DEPLOYMENT): {
      const result = action.payload?.data?.configureDeployment;
      const message = firstErrorMessage(result?.errors);
      if (message) {
        return { ...state, deploymentConfiguration: { ...state.deploymentConfiguration, submitting: false, error: message } };
      }
      return {
        ...state,
        deploymentConfiguration: {
          ...state.deploymentConfiguration,
          submitting: false,
          error: null,
          data: result?.deploymentConfiguration || state.deploymentConfiguration.data,
        },
      };
    }
    case err(ACTION_TYPE.CONFIGURE_DEPLOYMENT):
      return {
        ...state,
        deploymentConfiguration: { ...state.deploymentConfiguration, submitting: false, error: formatServerError(action.payload) },
      };

    default:
      return state;
  }
}

export { initialState };
export default reducer;
