import { graphqlWithVariables, decodeId } from "@openimis/fe-core";
import { ACTION_TYPE } from "./reducer";
import { EXPORT_JOB_POLL_INTERVAL_MS, MOCK_EXPORT_POLL_INTERVAL_MS } from "./constants";

// GraphQL operation strings target the REAL openimis-be-ledger_py schema
// (feature-37591): snake_case root fields, Relay connections, graphene-django
// camelCased root fields/filters (graphene-django auto-camelCases the Python
// snake_case field names) and UUID resolver args (party/funder). The deployed
// LedgerEntryGQLType does not expose the `transaction`/legs object, so the
// node is limited to its scalar + journal/accountingPeriod fields. The legacy
// design contract in contracts/graphql-operations.md described the pre-stub
// schema and is no longer the source of truth for these operations.

const LEDGER_ENTRIES_QUERY = `
  query LedgerEntries(
    $journal: String, $accountingPeriodCode: String, $party: UUID, $funder: UUID,
    $sourceEventType: LedgerEntryMetaSourceEventType, $first: Int, $after: String, $before: String, $last: Int
  ) {
    ledgerEntries(
      journal_Code: $journal, accountingPeriod_Code: $accountingPeriodCode,
      party: $party, funder: $funder, sourceEventType: $sourceEventType,
      first: $first, after: $after, before: $before, last: $last
    ) {
      totalCount
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      edges {
        node {
          id
          journal { code name }
          accountingPeriod { id status }
          sourceEventType sourceEventReference postedAt
        }
      }
    }
  }
`;

const ACCOUNTING_PERIODS_QUERY = `
  query AccountingPeriods {
    accountingPeriods {
      totalCount
      edges {
        node {
          id startDate endDate name code status lockedAt closedAt
        }
      }
    }
  }
`;

// ASSUMPTION (research.md §6 leaves the exact search operation unspecified):
// contracts/graphql-operations.md establishes that `partyLedgerBalance`/
// `funderActivityReport` take an `analyticValueId`, and research.md §6 says
// lookups go through the ledger backend's own `AnalyticValue`-backed search,
// but no query name/shape for that search box itself is given. This module
// assumes a single `analyticValues(search, tagType)` query distinguishing
// "party" vs "funder" via `tagType`, returning the `PartyResultViewModel`/
// `FunderResultViewModel` fields from data-model.md. Adjust once the backend
// contract names this explicitly.
const ANALYTIC_VALUES_QUERY = `
  query AnalyticValues($search: String, $first: Int) {
    analyticValue(displayName: $search, first: $first) {
      totalCount
      edges {
        node {
          id displayName partyType funderCode externalReference
        }
      }
    }
  }
`;

const PARTY_LEDGER_BALANCE_QUERY = `
  query PartyLedgerBalance($analyticValueId: ID!, $accountingPeriod: ID!) {
    partyLedgerBalance(analyticValueId: $analyticValueId, accountingPeriod: $accountingPeriod) {
      analyticValueId accountingPeriodId debitTotal creditTotal balance carriedForwardBalance
      transactions {
        id journal { code name } postedAt sourceEventType sourceEventReference
        lines: legs { id account { code name } debit credit }
      }
    }
  }
`;

const FUNDER_ACTIVITY_REPORT_QUERY = `
  query FunderActivityReport($analyticValueId: ID!, $accountingPeriodStart: ID, $accountingPeriodEnd: ID) {
    funderActivityReport(
      analyticValueId: $analyticValueId
      accountingPeriodStart: $accountingPeriodStart
      accountingPeriodEnd: $accountingPeriodEnd
    ) {
      analyticValueId debitTotal creditTotal balance
      byCategory { category debit credit balance }
    }
  }
`;

const OPEN_ACCOUNTING_PERIOD_MUTATION = `
  mutation OpenAccountingPeriod($startDate: Date!, $endDate: Date!) {
    openAccountingPeriod(startDate: $startDate, endDate: $endDate) {
      clientMutationId
      accountingPeriod { id startDate endDate status }
      errors { field message }
    }
  }
`;

const LOCK_ACCOUNTING_PERIOD_MUTATION = `
  mutation LockAccountingPeriod($accountingPeriodId: ID!) {
    lockAccountingPeriod(accountingPeriodId: $accountingPeriodId) {
      clientMutationId
      accountingPeriod { id status lockedAt }
      errors { field message }
    }
  }
`;

const CLOSE_ACCOUNTING_PERIOD_MUTATION = `
  mutation CloseAccountingPeriod($accountingPeriodId: ID!) {
    closeAccountingPeriod(accountingPeriodId: $accountingPeriodId) {
      clientMutationId
      accountingPeriod { id status closedAt }
      errors { field message }
    }
  }
`;

const REOPEN_ACCOUNTING_PERIOD_MUTATION = `
  mutation ReopenAccountingPeriod($accountingPeriodId: ID!) {
    reopenAccountingPeriod(accountingPeriodId: $accountingPeriodId) {
      clientMutationId
      accountingPeriod { id status }
      errors { field message }
    }
  }
`;

const MANUAL_REVIEW_QUEUE_QUERY = `
  query ManualReviewQueue($status: String) {
    manualReviewQueue(status: $status) {
      id status createdAt rejectionReason targetSystem
      originalEntry { id partyAnalyticValueId accountingPeriodId }
      resolvedAt resolutionNote correctingEntryId
    }
  }
`;

const RESOLVE_MANUAL_REVIEW_ITEM_MUTATION = `
  mutation ResolveManualReviewItem($reviewItemId: ID!, $correctingTransactionId: ID!, $resolutionNote: String!) {
    resolveManualReviewItem(
      reviewItemId: $reviewItemId
      correctingTransactionId: $correctingTransactionId
      resolutionNote: $resolutionNote
    ) {
      clientMutationId
      manualReviewQueueItem { id status resolvedAt resolutionNote correctingEntryId }
      errors { field message }
    }
  }
`;

const EXPORT_ACCOUNTING_PERIOD_MUTATION = `
  mutation ExportAccountingPeriod($accountingPeriodId: ID!, $format: String!) {
    exportAccountingPeriod(accountingPeriodId: $accountingPeriodId, format: $format) {
      clientMutationId
      exportJob { accountingPeriodId format status provisional }
      errors { field message }
    }
  }
`;

const EXPORT_SEQUENCES_QUERY = `
  query ExportSequences($accountingPeriod: ID!, $journal: String) {
    exportSequences(accountingPeriod: $accountingPeriod, journal: $journal) {
      accountingPeriodId format status provisional downloadUrl failureMessage
    }
  }
`;

const LEDGER_DEPLOYMENT_REFERENCE_DATA_QUERY = `
  query LedgerDeploymentReferenceData {
    externalSystems { code label }
    currencyCodes { code label }
    chartOfAccounts { id code name }
    deploymentConfiguration { operatingMode externalSystem currencyCode retainedEarningsAccount { id code name } }
  }
`;

const CONFIGURE_DEPLOYMENT_MUTATION = `
  mutation ConfigureDeployment(
    $operatingMode: String!, $externalSystem: String, $currencyCode: String!, $retainedEarningsAccountId: ID!
  ) {
    configureDeployment(
      operatingMode: $operatingMode, externalSystem: $externalSystem,
      currencyCode: $currencyCode, retainedEarningsAccountId: $retainedEarningsAccountId
    ) {
      clientMutationId
      deploymentConfiguration { operatingMode externalSystem currencyCode retainedEarningsAccount { id code name } }
      errors { field message }
    }
  }
`;

const mockId = (type, id) => btoa(`${type}:${id}`);
const OPEN_PERIOD_ID = mockId("AccountingPeriod", 1);
const CLOSED_PERIOD_ID = mockId("AccountingPeriod", 2);
const MOCK_RETAINED_EARNINGS_ACCOUNT_ID = mockId("ChartOfAccounts", 105);
const ALL_PERIODS_FILTER_VALUE = "__all__";
const MOCK_CAPITAL_RESERVE_ACCOUNT_ID = mockId("ChartOfAccounts", 110);
const analyticId = (id) => mockId("AnalyticValue", id);

const decodeMockId = (encoded) => {
  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    return separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded;
  } catch {
    return encoded;
  }
};

const MOCK_LEDGER_PERIOD_KEYS = {
  [OPEN_PERIOD_ID]: "open",
  [CLOSED_PERIOD_ID]: "closed",
};

// Carried-forward (opening) balances per party and period, tuned so the
// Party Sub-Ledger screen exposes every acceptance scenario to a manual
// tester: debtor (positive), creditor (negative), settled (zero) and
// empty periods showing only the carried-forward balance.
const MOCK_PARTY_OPENING_BALANCES = {
  "HF-1": { open: 12000, closed: 3000 },
  "HF-2": { open: -8400, closed: 0 },
  "HF-3": { open: 0, closed: 1000 },
  "FAM-1": { open: 800, closed: 500 },
  "FAM-2": { open: 0, closed: 0 },
  "PPM-1": { open: 0, closed: 4000 },
  "PPM-2": { open: -500, closed: 200 },
};

const partyTag = (id, displayName) => ({ analyticValueId: id, displayName });
const funderTag = (id, displayName) => ({ analyticValueId: id, displayName });
const mockEntry = (id, journal, periodId, status, sourceEventType, sourceEventReference, postedAt, amount, party, funder) => ({
  id: mockId("LedgerEntry", id),
  journal: { code: journal, name: journal },
  accountingPeriod: { id: periodId, status },
  sourceEventType,
  sourceEventReference,
  postedAt,
  lines: [
    {
      id: mockId("LedgerEntryLine", `${id}-d`),
      account: { code: "4010", name: "Debit account" },
      debit: amount,
      credit: null,
      partyTag: party,
      funderTag: funder,
    },
    {
      id: mockId("LedgerEntryLine", `${id}-c`),
      account: { code: "5120", name: "Credit account" },
      debit: null,
      credit: amount,
      partyTag: party,
      funderTag: funder,
    },
  ],
});

const MOCK_LEDGER_ENTRIES = [
  mockEntry(1, "BANK", OPEN_PERIOD_ID, "open", "claim_payment", "CLM-2026-0001", "2026-07-24", 12500, partyTag(analyticId("HF-1"), "District Hospital"), funderTag(analyticId("GIZ"), "GIZ")),
  mockEntry(2, "SALES", OPEN_PERIOD_ID, "open", "invoice", "INV-2026-0007", "2026-07-23", 7800, partyTag(analyticId("FAM-1"), "Family Doe"), funderTag(analyticId("WB"), "World Bank")),
  mockEntry(3, "BANK", OPEN_PERIOD_ID, "open", "payroll_disbursement", "PAY-2026-0003", "2026-07-22", 9200, partyTag(analyticId("PPM-1"), "Payment Point Manager A"), funderTag(analyticId("GIZ"), "GIZ")),
  mockEntry(4, "MISC", OPEN_PERIOD_ID, "open", "payment_point_reconciliation", "PPR-2026-0004", "2026-07-21", 4300, partyTag(analyticId("PPM-2"), "Payment Point Manager B"), funderTag(analyticId("WB"), "World Bank")),
  mockEntry(5, "PURCHASES", OPEN_PERIOD_ID, "open", "correction", "COR-2026-0005", "2026-07-20", 2100, partyTag(analyticId("HF-2"), "Urban Clinic"), funderTag(analyticId("GIZ"), "GIZ")),
  mockEntry(6, "MISC", OPEN_PERIOD_ID, "open", "closing_entry", "CLS-2026-0006", "2026-07-19", 500, null, null),
  mockEntry(7, "BANK", CLOSED_PERIOD_ID, "closed", "claim_payment", "CLM-2026-0101", "2026-06-28", 6100, partyTag(analyticId("HF-1"), "District Hospital"), funderTag(analyticId("GIZ"), "GIZ")),
  mockEntry(8, "SALES", CLOSED_PERIOD_ID, "closed", "invoice", "INV-2026-0102", "2026-06-27", 3200, partyTag(analyticId("FAM-2"), "Family Smith"), funderTag(analyticId("WB"), "World Bank")),
  mockEntry(9, "BANK", OPEN_PERIOD_ID, "open", "claim_payment", "CLM-2026-0009", "2026-07-18", 1600, partyTag(analyticId("HF-3"), "Rural Health Center"), funderTag(analyticId("UNICEF"), "UNICEF")),
  mockEntry(10, "SALES", OPEN_PERIOD_ID, "open", "invoice", "INV-2026-0010", "2026-07-17", 2700, partyTag(analyticId("FAM-1"), "Family Doe"), funderTag(analyticId("GIZ"), "GIZ")),
  mockEntry(11, "BANK", OPEN_PERIOD_ID, "open", "claim_payment", "CLM-2026-0011", "2026-07-16", 3400, partyTag(analyticId("HF-1"), "District Hospital"), funderTag(analyticId("WB"), "World Bank")),
  mockEntry(12, "PURCHASES", OPEN_PERIOD_ID, "open", "payroll_disbursement", "PAY-2026-0012", "2026-07-15", 1900, partyTag(analyticId("PPM-1"), "Payment Point Manager A"), funderTag(analyticId("UNICEF"), "UNICEF")),
  mockEntry(13, "MISC", OPEN_PERIOD_ID, "open", "payment_point_reconciliation", "PPR-2026-0013", "2026-07-14", 800, partyTag(analyticId("PPM-2"), "Payment Point Manager B"), funderTag(analyticId("GIZ"), "GIZ")),
];

const MOCK_ACCOUNTING_PERIODS = [
  {
    id: mockId("AccountingPeriod", 1),
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "open",
  },
  {
    id: mockId("AccountingPeriod", 2),
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    status: "closed",
  },
];

// Mutable "server-side" copy of the accounting periods (DECODED ids, matching
// the view-model ids the pickers and pages consume after the reducer's
// decodeId pass). The US4 mock mutations below update it, and
// fetchAccountingPeriodsMock returns the current snapshot so the UI reflects
// every successful lifecycle action.
let mockAccountingPeriods = MOCK_ACCOUNTING_PERIODS.map((period) => ({ ...period, id: decodeMockId(period.id) }));

export const resetAccountingPeriodsMock = () => {
  mockAccountingPeriods = MOCK_ACCOUNTING_PERIODS.map((period) => ({ ...period, id: decodeMockId(period.id) }));
};

// Carried-forward balances per funder so the aggregated totals and the
// signed balance vary from one funder to the next during manual testing.
const MOCK_FUNDER_OPENING_BALANCES = {
  GIZ: 4700,
  WB: -1200,
  UNICEF: 300,
};

const MOCK_MANUAL_REVIEW_QUEUE = [
  {
    id: "review-1",
    status: "pending",
    createdAt: "2026-07-25T08:30:00Z",
    rejectionReason: "Replication rejected by Odoo",
    targetSystem: "odoo",
    originalEntry: {
      id: "1",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "1",
    },
    resolvedAt: null,
    resolutionNote: null,
    correctingEntryId: null,
  },
  {
    id: "review-2",
    status: "resolved",
    createdAt: "2026-07-02T09:15:00Z",
    rejectionReason: "Unconfirmed posting in Sage",
    targetSystem: "sage",
    originalEntry: {
      id: "7",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "2",
    },
    resolvedAt: "2026-07-01T10:00:00Z",
    resolutionNote: "Correction linked during month-end review",
    correctingEntryId: "7",
  },
  {
    id: "review-3",
    status: "pending",
    createdAt: "2026-07-28T14:20:00Z",
    rejectionReason: "Replication rejected by Odoo",
    targetSystem: "odoo",
    originalEntry: {
      id: "9",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "1",
    },
    resolvedAt: null,
    resolutionNote: null,
    correctingEntryId: null,
  },
  {
    id: "review-4",
    status: "resolved",
    createdAt: "2026-07-20T11:45:00Z",
    rejectionReason: "Unconfirmed posting in Sage",
    targetSystem: "sage",
    originalEntry: {
      id: "15",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "2",
    },
    resolvedAt: null,
    resolutionNote: "Awaiting manager approval",
    correctingEntryId: null,
  },
  {
    id: "review-5",
    status: "pending",
    createdAt: "2026-07-15T16:00:00Z",
    rejectionReason: "Replication rejected by Odoo",
    targetSystem: "odoo",
    originalEntry: {
      id: "23",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "1",
    },
    resolvedAt: null,
    resolutionNote: null,
    correctingEntryId: null,
  },
  {
    id: "review-6",
    status: "resolved",
    createdAt: "2026-06-28T13:20:00Z",
    rejectionReason: "Unconfirmed posting in Sage",
    targetSystem: "sage",
    originalEntry: {
      id: "96",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "2",
    },
    resolvedAt: "2026-06-30T14:00:00Z",
    resolutionNote: "Correction linked during month-end review",
    correctingEntryId: "7",
  },
  {
    id: "review-7",
    status: "pending",
    createdAt: "2026-08-01T07:30:00Z",
    rejectionReason: "Replication rejected by Odoo",
    targetSystem: "odoo",
    originalEntry: {
      id: "47",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "1",
    },
    resolvedAt: null,
    resolutionNote: null,
    correctingEntryId: null,
  },
  {
    id: "review-8",
    status: "resolved",
    createdAt: "2026-07-10T10:15:00Z",
    rejectionReason: "Unconfirmed posting in Sage",
    targetSystem: "sage",
    originalEntry: {
      id: "102",
      partyAnalyticValueId: analyticId("HF-1"),
      accountingPeriodId: "2",
    },
    resolvedAt: "2026-07-12T09:00:00Z",
    resolutionNote: "Correction linked during month-end review",
    correctingEntryId: "7",
  },
];

let mockManualReviewQueue = MOCK_MANUAL_REVIEW_QUEUE.map((item) => ({
  ...item,
  originalEntry: { ...item.originalEntry },
}));

export const resetManualReviewQueueMock = () => {
  mockManualReviewQueue = MOCK_MANUAL_REVIEW_QUEUE.map((item) => ({
    ...item,
    originalEntry: { ...item.originalEntry },
  }));
};

export function fetchLedgerEntriesMock(params = []) {
  return (dispatch) => {
    const getParam = (name) => {
      const match = params.find((p) => p.startsWith(`${name}:`))?.match(/:\s*"?([^"]+)"?/);
      return match?.[1] ?? null;
    };
    const first = Number(getParam("first")) || 10;
    const last = Number(getParam("last")) || first;
    const after = getParam("after");
    const before = getParam("before");
    const explicitPeriod = getParam("accountingPeriod");
    const matchesTag = (entry, tagType, value) =>
      !value ||
      entry.lines.some((line) => {
        const tag = line[`${tagType}Tag`];
        const search = value.toLowerCase();
        return (
          tag?.analyticValueId?.toLowerCase() === search ||
          tag?.displayName?.toLowerCase().includes(search)
        );
      });

    const periodFilterId = explicitPeriod ?? OPEN_PERIOD_ID;
    const scopedPeriodFilterId =
      periodFilterId === ALL_PERIODS_FILTER_VALUE
        ? null
        : periodFilterId === OPEN_PERIOD_ID || periodFilterId === CLOSED_PERIOD_ID
          ? periodFilterId
          : mockId("AccountingPeriod", periodFilterId);
    const filteredEntries = MOCK_LEDGER_ENTRIES
      .filter((entry) => !scopedPeriodFilterId || entry.accountingPeriod.id === scopedPeriodFilterId)
      .filter((entry) => !getParam("journal") || entry.journal.code === getParam("journal"))
      .filter((entry) => !getParam("sourceEventType") || entry.sourceEventType === getParam("sourceEventType"))
      .filter((entry) => matchesTag(entry, "party", getParam("party")))
      .filter((entry) => matchesTag(entry, "funder", getParam("funder")))
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    const start = before ? Math.max(Number(before) - last, 0) : after ? Number(after) + 1 : 0;
    const pageSize = before ? last : first;
    const pageEntries = filteredEntries.slice(start, start + pageSize);
    const endCursor = pageEntries.length ? String(start + pageEntries.length - 1) : null;

    dispatch({ type: `${ACTION_TYPE.LEDGER_ENTRIES}_REQ`, meta: { filters: {} } });
    dispatch({
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: {
        data: {
          ledgerEntries: {
            totalCount: filteredEntries.length,
            pageInfo: {
              hasNextPage: start + first < filteredEntries.length,
              hasPreviousPage: start > 0,
              startCursor: pageEntries.length ? String(start) : null,
              endCursor,
            },
            edges: pageEntries.map((node) => ({ node })),
          },
        },
      },
      meta: { params },
    });
  };
}

export function fetchAccountingPeriodsMock() {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ` });
    // Dispatch the same Relay-connection shape the real backend returns so the
    // reducer handles both paths uniformly (US4 stays mock-backed until its own
    // integration ticket).
    dispatch({
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: {
        data: {
          accountingPeriods: {
            totalCount: mockAccountingPeriods.length,
            edges: mockAccountingPeriods.map((period) => ({ node: period })),
          },
        },
      },
    });
  };
}

export function fetchManualReviewQueueMock(status = null) {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_RESP`,
      payload: {
        data: {
          manualReviewQueue: status ? mockManualReviewQueue.filter((item) => item.status === status) : mockManualReviewQueue,
        },
      },
    });
  };
}

export function resolveManualReviewItemMock(reviewItemId, correctingTransactionId, resolutionNote) {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_REQ` });
    const item = mockManualReviewQueue.find((candidate) => candidate.id === reviewItemId);
    const candidate = MOCK_LEDGER_ENTRIES.find(
      (entry) =>
        decodeMockId(entry.id) === correctingTransactionId &&
        entry.accountingPeriod.id === mockId("AccountingPeriod", item?.originalEntry?.accountingPeriodId) &&
        entry.lines.some((line) => line.partyTag?.analyticValueId === item?.originalEntry?.partyAnalyticValueId),
    );

    if (!item || item.status !== "pending" || !candidate || !String(resolutionNote || "").trim()) {
      dispatch({
        type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
        payload: {
          data: {
            resolveManualReviewItem: {
              errors: [{ message: "A pending item requires a valid same-party, same-period correction and a note." }],
            },
          },
        },
      });
      return;
    }

    const updated = {
      ...item,
      status: "resolved",
      resolvedAt: "2026-08-10T10:00:00Z",
      resolutionNote: String(resolutionNote).trim(),
      correctingEntryId: correctingTransactionId,
    };
    mockManualReviewQueue = mockManualReviewQueue.map((candidateItem) =>
      candidateItem.id === reviewItemId ? updated : candidateItem,
    );
    dispatch({
      type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
      payload: { data: { resolveManualReviewItem: { manualReviewQueueItem: updated, errors: [] } } },
    });
  };
}

/**
 * User Story 2 — mock counterpart of `fetchPartyLedgerBalance`. The
 * statement is derived from `MOCK_LEDGER_ENTRIES` filtered by the selected
 * party and accounting period, so changing either filter changes the data
 * (transactions, balance, carried-forward balance) exactly like the real
 * backend would.
 */
export function fetchPartyLedgerBalanceMock(analyticValueId, accountingPeriodId) {
  return (dispatch) => {
    // The picker hands the DECODED period id (e.g. "1"); re-encode it like
    // fetchLedgerEntriesMock does so it matches MOCK_LEDGER_ENTRIES ids.
    const scopedPeriodId =
      accountingPeriodId === OPEN_PERIOD_ID || accountingPeriodId === CLOSED_PERIOD_ID
        ? accountingPeriodId
        : mockId("AccountingPeriod", accountingPeriodId);
    const periodEntries = MOCK_LEDGER_ENTRIES.filter(
      (entry) =>
        entry.accountingPeriod.id === scopedPeriodId &&
        entry.lines.some((line) => line.partyTag?.analyticValueId === analyticValueId),
    );
    const debitTotal = periodEntries.reduce(
      (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + (Number(line.debit) || 0), 0),
      0,
    );
    const creditTotal = periodEntries.reduce(
      (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + (Number(line.credit) || 0), 0),
      0,
    );
    const partyKey = decodeMockId(analyticValueId);
    const periodKey = MOCK_LEDGER_PERIOD_KEYS[scopedPeriodId] ?? "other";
    const carriedForwardBalance = MOCK_PARTY_OPENING_BALANCES[partyKey]?.[periodKey] ?? 0;

    dispatch({ type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
      payload: {
        data: {
          partyLedgerBalance: {
            analyticValueId,
            accountingPeriodId: scopedPeriodId,
            debitTotal,
            creditTotal,
            balance: carriedForwardBalance + debitTotal - creditTotal,
            carriedForwardBalance,
            transactions: periodEntries.map((entry) => ({
              id: entry.id,
              journal: entry.journal,
              accountingPeriod: entry.accountingPeriod,
              sourceEventType: entry.sourceEventType,
              sourceEventReference: entry.sourceEventReference,
              postedAt: entry.postedAt,
              lines: entry.lines,
            })),
          },
        },
      },
    });
  };
}

/**
 * User Story 3 — mock counterpart of `fetchFunderActivityReport`. The
 * report is derived from `MOCK_LEDGER_ENTRIES` filtered by the selected
 * funder and period range, so changing either filter changes the totals
 * and the category breakdown exactly like the real backend would.
 */
export function fetchFunderActivityReportMock(analyticValueId, periodRange = {}) {
  return (dispatch) => {
    // The period pickers hand DECODED ids (e.g. "1"); re-encode them like
    // fetchLedgerEntriesMock does so they match MOCK_LEDGER_ENTRIES ids.
    const normalizedPeriodId = (id) =>
      id === OPEN_PERIOD_ID || id === CLOSED_PERIOD_ID ? id : mockId("AccountingPeriod", id);
    // Chronological order for range filtering: closed period (June) = 1, open period (July) = 2.
    const periodIndex = (id) => {
      const normalized = normalizedPeriodId(id);
      return normalized === CLOSED_PERIOD_ID ? 1 : normalized === OPEN_PERIOD_ID ? 2 : null;
    };
    const startIndex = periodRange?.start ? periodIndex(periodRange.start) : null;
    const endIndex = periodRange?.end ? periodIndex(periodRange.end) : null;
    // The selection is treated as the inclusive span between the two bounds
    // regardless of picker order, so every start/end combination returns data.
    const minIndex = startIndex !== null && endIndex !== null ? Math.min(startIndex, endIndex) : startIndex ?? endIndex;
    const maxIndex = startIndex !== null && endIndex !== null ? Math.max(startIndex, endIndex) : startIndex ?? endIndex;
    const inRange = (entry) => {
      const idx = periodIndex(entry.accountingPeriod.id);
      if (idx === null) return false;
      if (minIndex !== null && idx < minIndex) return false;
      if (maxIndex !== null && idx > maxIndex) return false;
      return true;
    };

    const periodEntries = MOCK_LEDGER_ENTRIES.filter(
      (entry) =>
        inRange(entry) && entry.lines.some((line) => line.funderTag?.analyticValueId === analyticValueId),
    );

    const totalsFor = (entries) => {
      const debit = entries.reduce(
        (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + (Number(line.debit) || 0), 0),
        0,
      );
      const credit = entries.reduce(
        (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + (Number(line.credit) || 0), 0),
        0,
      );
      return { debit, credit, balance: debit - credit };
    };

    const totals = totalsFor(periodEntries);
    const categories = [...new Set(periodEntries.map((entry) => entry.sourceEventType))].sort();
    const byCategory = categories.map((category) => ({
      category,
      ...totalsFor(periodEntries.filter((entry) => entry.sourceEventType === category)),
    }));
    const funderKey = decodeMockId(analyticValueId);
    const openingBalance = MOCK_FUNDER_OPENING_BALANCES[funderKey] ?? 0;

    dispatch({ type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_RESP`,
      payload: {
        data: {
          funderActivityReport: {
            analyticValueId,
            accountingPeriodStart: periodRange.start ?? null,
            accountingPeriodEnd: periodRange.end ?? null,
            debitTotal: totals.debit,
            creditTotal: totals.credit,
            balance: openingBalance + totals.balance,
            byCategory,
          },
        },
      },
    });
  };
}

// --- User Story 4: Accounting period lifecycle mocks ----------------------
// Stand-ins for the backend mutations. They enforce the chronological rules
// (oldest-open-first lock, oldest-locked-first close, newest-closed-first
// reopen, no new period while an unclosed one exists) and return the
// rejection reason in `errors[].message` exactly like the backend would, so
// FR-009's verbatim display can be exercised without a real server.
// mockAccountingPeriods always holds DECODED ids, so only the query argument may
// need decoding (a caller can still pass an encoded id such as OPEN_PERIOD_ID).
const findMockPeriod = (id) =>
  mockAccountingPeriods.find((period) => period.id === id || period.id === decodeMockId(id));

function dispatchMockPeriodTransition({
  dispatch,
  accountingPeriodId,
  actionType,
  payloadKey,
  actionLabel,
  expectedStatus,
  blockers,
  updatedPeriod,
}) {
  const period = findMockPeriod(accountingPeriodId);
  const errors = [];
  if (!period) {
    errors.push({ field: "accountingPeriodId", message: "Accounting period not found." });
  } else if (period.status !== expectedStatus) {
    errors.push({
      field: "accountingPeriodId",
      message: `Cannot ${actionLabel} period ${period.startDate} — ${period.endDate}: it is ${period.status}, not ${expectedStatus}.`,
    });
  } else if (blockers.length) {
    errors.push({
      field: "accountingPeriodId",
      message: `Cannot ${actionLabel} period ${period.startDate} — ${period.endDate} while period ${blockers[0].startDate} — ${blockers[0].endDate} is ${blockers[0].status}.`,
    });
  }

  dispatch({ type: `${actionType}_REQ` });
  if (errors.length) {
    dispatch({
      type: `${actionType}_RESP`,
      payload: { data: { [payloadKey]: { clientMutationId: null, accountingPeriod: null, errors } } },
    });
    return;
  }
  mockAccountingPeriods = mockAccountingPeriods.map((p) => (p.id === period.id ? updatedPeriod : p));
  dispatch({
    type: `${actionType}_RESP`,
    payload: {
      data: {
        [payloadKey]: { clientMutationId: "mock-period-transition", accountingPeriod: updatedPeriod, errors: [] },
      },
    },
  });
}

export function openAccountingPeriodMock(startDate, endDate) {
  return (dispatch) => {
    const errors = [];
    const blocker = mockAccountingPeriods.find((period) => period.status === "open" || period.status === "locked");
    if (blocker) {
      errors.push({
        field: "startDate",
        message: `Cannot open a new period while ${blocker.startDate} — ${blocker.endDate} is still ${blocker.status}. Lock and close it first.`,
      });
    } else {
      const sorted = [...mockAccountingPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const latest = sorted[sorted.length - 1];
      if (latest && startDate <= latest.endDate) {
        errors.push({
          field: "startDate",
          message: `A new period must start after the end of the latest period (${latest.endDate}).`,
        });
      }
    }
    if (!startDate || !endDate) {
      errors.push({ field: "startDate", message: "Both start and end dates are required." });
    } else if (startDate >= endDate) {
      errors.push({ field: "endDate", message: "The period end date must be after its start date." });
    }

    dispatch({ type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_REQ` });
    if (errors.length) {
      dispatch({
        type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
        payload: {
          data: { openAccountingPeriod: { clientMutationId: null, accountingPeriod: null, errors } },
        },
      });
      return;
    }
    // mockAccountingPeriods ids are already DECODED: re-decoding them here (decodeMockId)
    // would atob() plain numeric strings and yield NaN for any id >= 10, freezing the counter.
    const nextId = String(
      mockAccountingPeriods.reduce((max, period) => Math.max(max, Number(period.id) || 0), 0) + 1,
    );
    const created = { id: nextId, startDate, endDate, status: "open" };
    mockAccountingPeriods = [...mockAccountingPeriods, created];
    dispatch({
      type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
      payload: {
        data: { openAccountingPeriod: { clientMutationId: "mock-open-period", accountingPeriod: created, errors: [] } },
      },
    });
  };
}

export function lockAccountingPeriodMock(accountingPeriodId) {
  return (dispatch) => {
    const period = findMockPeriod(accountingPeriodId);
    const earliestOpen = [...mockAccountingPeriods]
      .filter((p) => p.status === "open")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const blockers = period && earliestOpen && earliestOpen.id !== period.id ? [earliestOpen] : [];
    dispatchMockPeriodTransition({
      dispatch,
      accountingPeriodId,
      actionType: ACTION_TYPE.LOCK_ACCOUNTING_PERIOD,
      payloadKey: "lockAccountingPeriod",
      actionLabel: "lock",
      expectedStatus: "open",
      blockers,
      updatedPeriod: period ? { ...period, status: "locked", lockedAt: new Date().toISOString() } : null,
    });
  };
}

export function closeAccountingPeriodMock(accountingPeriodId) {
  return (dispatch) => {
    const period = findMockPeriod(accountingPeriodId);
    const earliestLocked = [...mockAccountingPeriods]
      .filter((p) => p.status === "locked")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const blockers = period && earliestLocked && earliestLocked.id !== period.id ? [earliestLocked] : [];
    dispatchMockPeriodTransition({
      dispatch,
      accountingPeriodId,
      actionType: ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD,
      payloadKey: "closeAccountingPeriod",
      actionLabel: "close",
      expectedStatus: "locked",
      blockers,
      updatedPeriod: period ? { ...period, status: "closed", closedAt: new Date().toISOString() } : null,
    });
  };
}

export function reopenAccountingPeriodMock(accountingPeriodId) {
  return (dispatch) => {
    const period = findMockPeriod(accountingPeriodId);
    const closedPeriods = [...mockAccountingPeriods]
      .filter((p) => p.status === "closed")
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const latestClosed = closedPeriods[closedPeriods.length - 1];
    const blockers = period && latestClosed && latestClosed.id !== period.id ? [latestClosed] : [];
    dispatchMockPeriodTransition({
      dispatch,
      accountingPeriodId,
      actionType: ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD,
      payloadKey: "reopenAccountingPeriod",
      actionLabel: "reopen",
      expectedStatus: "closed",
      blockers,
      updatedPeriod: period ? { ...period, status: "open" } : null,
    });
  };
}

/**
 * Dispatches the real `ledgerEntries` query (US1, FR-001). `filters` uses the
 * frontend view-model names (`accountingPeriodId`, `partyAnalyticValueId`,
 * `funderAnalyticValueId`, `journal`, `sourceEventType`), translated to the
 * backend's GraphQL arguments (`journal_Code`, `accountingPeriod_Code`,
 * `party`/`funder` as raw UUIDs, `sourceEventType`).
 *
 * The backend has no `accounting_period__id` filter, so an explicit period is
 * passed via its unique `code` (resolved from `state.ledger.accountingPeriods`).
 * Per FR-001, when no period filter is set, this defaults to the current open
 * period's code rather than sending an unscoped query.
 */
const decodeUuid = (id) => {
  if (!id) return null;
  try {
    return decodeId(id);
  } catch {
    return id;
  }
};

// graphene-django exposes choice fields as enums: the filter argument expects
// the CONSTANT_CASE member name (e.g. "CLAIM_PAYMENT"), while the frontend
// view-model uses the lowercase Django value ("claim_payment").
const toGrapheneEnum = (value) =>
  value ? String(value).toUpperCase().replace(/[^A-Z0-9]/g, "_") : null;

export function fetchLedgerEntries(filters = {}, pageInfo = {}) {
  return async (dispatch, getState) => {
    let accountingPeriodId = filters.accountingPeriodId;
    if (accountingPeriodId === undefined) {
      const openPeriod = getState().ledger?.accountingPeriods?.items?.find((period) => period.status === "open");
      accountingPeriodId = openPeriod?.id ?? null;
    }

    const periods = getState().ledger?.accountingPeriods?.items || [];
    const accountingPeriodCode = accountingPeriodId
      ? (periods.find((period) => period.id === accountingPeriodId)?.code ?? null)
      : null;

    const resolvedFilters = { ...filters, accountingPeriodId };

    const variables = {
      journal: filters.journal ?? null,
      accountingPeriodCode,
      party: decodeUuid(filters.partyAnalyticValueId),
      funder: decodeUuid(filters.funderAnalyticValueId),
      sourceEventType: toGrapheneEnum(filters.sourceEventType),
      first: pageInfo.first ?? null,
      after: pageInfo.after ?? null,
      before: pageInfo.before ?? null,
      last: pageInfo.last ?? null,
    };

    return dispatch(
      graphqlWithVariables(
        LEDGER_ENTRIES_QUERY,
        variables,
        [`${ACTION_TYPE.LEDGER_ENTRIES}_REQ`, `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`, `${ACTION_TYPE.LEDGER_ENTRIES}_ERR`],
        { filters: resolvedFilters },
      ),
    );
  };
}

/**
 * Dispatches the AccountingPeriods query (Foundational T015; shared by
 * AccountingPeriodPicker and the US1 default-period lookup).
 */
export function fetchAccountingPeriods() {
  return graphqlWithVariables(ACCOUNTING_PERIODS_QUERY, {}, [
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ`,
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_ERR`,
  ]);
}

/** User Story 2 — party search over `analyticValue`. The backend only exposes
 * exact `displayName` matching (no icontains / axis filter), so the picker
 * fetches a bounded list and filters by axis client-side (keeps `partyType`
 * results only). */
export function searchParty(searchTerm) {
  const variables = { search: searchTerm || null, first: 25 };
  return graphqlWithVariables(ANALYTIC_VALUES_QUERY, variables, [
    `${ACTION_TYPE.PARTY_SEARCH}_REQ`,
    `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
    `${ACTION_TYPE.PARTY_SEARCH}_ERR`,
  ]);
}

/** User Story 2 — signed running balance + period statement for one party. */
export function resetPartyLedgerBalance() {
  return { type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET}` };
}

export function fetchPartyLedgerBalance(analyticValueId, accountingPeriodId) {
  const variables = { analyticValueId, accountingPeriod: accountingPeriodId };
  return graphqlWithVariables(PARTY_LEDGER_BALANCE_QUERY, variables, [
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_REQ`,
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_ERR`,
  ]);
}

/** User Story 3 — funder search over `analyticValue` (keeps `funderCode`
 * results only; exact `displayName` match, see searchParty). */
export function searchFunder(searchTerm) {
  const variables = { search: searchTerm || null, first: 25 };
  return graphqlWithVariables(ANALYTIC_VALUES_QUERY, variables, [
    `${ACTION_TYPE.FUNDER_SEARCH}_REQ`,
    `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
    `${ACTION_TYPE.FUNDER_SEARCH}_ERR`,
  ]);
}

/** User Story 3 — aggregated funder activity, independent of any party filter. */
export function fetchFunderActivityReport(analyticValueId, periodRange = {}) {
  const variables = {
    analyticValueId,
    accountingPeriodStart: periodRange.start ?? null,
    accountingPeriodEnd: periodRange.end ?? null,
  };
  return graphqlWithVariables(FUNDER_ACTIVITY_REPORT_QUERY, variables, [
    `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_REQ`,
    `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_RESP`,
    `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_ERR`,
  ]);
}

/** User Story 4 — open a new accounting period. */
export function openAccountingPeriod(startDate, endDate) {
  const variables = { startDate, endDate };
  return graphqlWithVariables(OPEN_ACCOUNTING_PERIOD_MUTATION, variables, [
    `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_REQ`,
    `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
    `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_ERR`,
  ]);
}

/** User Story 4 — period lifecycle transitions. `errors[].message` is surfaced verbatim (FR-009). */
export function lockAccountingPeriod(accountingPeriodId) {
  return graphqlWithVariables(LOCK_ACCOUNTING_PERIOD_MUTATION, { accountingPeriodId }, [
    `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_REQ`,
    `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_RESP`,
    `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_ERR`,
  ]);
}

export function closeAccountingPeriod(accountingPeriodId) {
  return graphqlWithVariables(CLOSE_ACCOUNTING_PERIOD_MUTATION, { accountingPeriodId }, [
    `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_REQ`,
    `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_RESP`,
    `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_ERR`,
  ]);
}

export function reopenAccountingPeriod(accountingPeriodId) {
  return graphqlWithVariables(REOPEN_ACCOUNTING_PERIOD_MUTATION, { accountingPeriodId }, [
    `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_REQ`,
    `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_RESP`,
    `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_ERR`,
  ]);
}

/** User Story 5 — flagged replication items awaiting manual resolution. */
export function fetchManualReviewQueue(status = null) {
  return graphqlWithVariables(MANUAL_REVIEW_QUEUE_QUERY, { status }, [
    `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_REQ`,
    `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_RESP`,
    `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_ERR`,
  ]);
}

/**
 * User Story 5 — resolve a review item by linking a correcting entry
 * (`correctingTransactionId` must come from a same-party/same-period
 * candidate per `utils/correctingEntryCandidates.js`; the original entry is
 * never edited, FR-012).
 */
export function resolveManualReviewItem(reviewItemId, correctingTransactionId, resolutionNote) {
  const variables = { reviewItemId, correctingTransactionId, resolutionNote };
  return graphqlWithVariables(RESOLVE_MANUAL_REVIEW_ITEM_MUTATION, variables, [
    `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_REQ`,
    `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
    `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_ERR`,
  ]);
}

/** User Story 6 — trigger an async export job; `format` is chosen per-trigger, never sourced from deployment config. */
export function exportAccountingPeriod(accountingPeriodId, format) {
  return graphqlWithVariables(EXPORT_ACCOUNTING_PERIOD_MUTATION, { accountingPeriodId, format }, [
    `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_REQ`,
    `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_RESP`,
    `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_ERR`,
  ]);
}

function fetchExportSequences(accountingPeriodId, journal = null) {
  return graphqlWithVariables(
    EXPORT_SEQUENCES_QUERY,
    { accountingPeriod: accountingPeriodId, journal },
    [`${ACTION_TYPE.EXPORT_SEQUENCES}_REQ`, `${ACTION_TYPE.EXPORT_SEQUENCES}_RESP`, `${ACTION_TYPE.EXPORT_SEQUENCES}_ERR`],
    { accountingPeriodId },
  );
}

/**
 * User Story 6 — polls `exportSequences` at a fixed interval while the job
 * is `in_progress` (research.md §5, FR-014 "no manual reload"), clearing the
 * interval once a terminal status (`complete`/`failed`) is reached. Returns
 * a `stop()` function the caller (PeriodExportPage) invokes on unmount.
 */
export function pollExportJob(accountingPeriodId, intervalMs = EXPORT_JOB_POLL_INTERVAL_MS) {
  return (dispatch, getState) => {
    let intervalId;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      await dispatch(fetchExportSequences(accountingPeriodId));
      if (stopped) return;
      const status = getState().ledger?.exportJobs?.byPeriodId?.[accountingPeriodId]?.status;
      if (status === "complete" || status === "failed") {
        clearInterval(intervalId);
      }
    };
    intervalId = setInterval(tick, intervalMs);
    tick();
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  };
}

/** Demo-only export flow. The real actions above remain unchanged. */
export function exportAccountingPeriodMock(accountingPeriodId, format, provisional = true) {
  return (dispatch) => {
    const job = { accountingPeriodId, format, status: "in_progress", provisional };
    dispatch({ type: `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_RESP`,
      payload: { data: { exportAccountingPeriod: { exportJob: job } } },
    });
  };
}

/** Demo-only polling flow: complete the job after two visible progress ticks. */
export function pollExportJobMock(
  accountingPeriodId,
  format = "generic",
  provisional = true,
  intervalMs = MOCK_EXPORT_POLL_INTERVAL_MS,
) {
  return (dispatch) => {
    let ticks = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      ticks += 1;
      if (ticks < 3) return;
      dispatch({
        type: `${ACTION_TYPE.EXPORT_SEQUENCES}_RESP`,
        payload: {
          data: {
            exportSequences: {
              accountingPeriodId,
              format,
              status: "complete",
              provisional,
              downloadUrl: `data:text/csv;charset=utf-8,accountingPeriodId%2Cstatus%0A${accountingPeriodId}%2Ccomplete`,
            },
          },
        },
      });
      clearInterval(intervalId);
    };
    const intervalId = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  };
}

/** User Story 7 — reference data for the deployment configuration form. */
export function fetchLedgerDeploymentReferenceData() {
  return graphqlWithVariables(LEDGER_DEPLOYMENT_REFERENCE_DATA_QUERY, {}, [
    `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_REQ`,
    `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
    `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_ERR`,
  ]);
}

/** User Story 7 — save deployment configuration; only dispatched post-acknowledgement on mode change (FR-018). */
export function configureDeployment(operatingMode, externalSystem, currencyCode, retainedEarningsAccountId) {
  const variables = { operatingMode, externalSystem, currencyCode, retainedEarningsAccountId };
  return graphqlWithVariables(CONFIGURE_DEPLOYMENT_MUTATION, variables, [
    `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_REQ`,
    `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_RESP`,
    `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_ERR`,
  ]);
}

/** Demo-only deployment reference data. The GraphQL action above remains the production path. */
export function fetchLedgerDeploymentReferenceDataMock() {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: {
        data: {
          externalSystems: [
            { code: "odoo", label: "Odoo" },
            { code: "sage", label: "Sage" },
          ],
          currencyCodes: [
            { code: "XAF", label: "Central African CFA franc" },
            { code: "EUR", label: "Euro" },
            { code: "USD", label: "US dollar" },
          ],
          chartOfAccounts: [
            { id: MOCK_RETAINED_EARNINGS_ACCOUNT_ID, code: "105000", name: "Retained earnings" },
            { id: MOCK_CAPITAL_RESERVE_ACCOUNT_ID, code: "110000", name: "Capital reserve" },
          ],
          deploymentConfiguration: {
            operatingMode: "local_only",
            externalSystem: null,
            currencyCode: "XAF",
            retainedEarningsAccount: {
              id: MOCK_RETAINED_EARNINGS_ACCOUNT_ID,
              code: "105000",
              name: "Retained earnings",
            },
          },
        },
      },
    });
  };
}

/** Demo-only save action; reducer handling is identical to the backend response shape. */
export function configureDeploymentMock(operatingMode, externalSystem, currencyCode, retainedEarningsAccountId) {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_RESP`,
      payload: {
        data: {
          configureDeployment: {
            errors: [],
            deploymentConfiguration: {
              operatingMode,
              externalSystem,
              currencyCode,
              retainedEarningsAccount: {
                id: retainedEarningsAccountId,
                code: retainedEarningsAccountId === "110" ? "110000" : "105000",
                name: retainedEarningsAccountId === "110" ? "Capital reserve" : "Retained earnings",
              },
            },
          },
        },
      },
    });
  };
}
