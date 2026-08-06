import { graphqlWithVariables } from "@openimis/fe-core";
import { ACTION_TYPE } from "./reducer";
import { EXPORT_JOB_POLL_INTERVAL_MS } from "./constants";

// GraphQL operation strings mirror contracts/graphql-operations.md verbatim
// (variable names, field aliases, and nesting) since that document is the
// authoritative source until openimis-be-ledger_py ships its real schema
// (research.md §2).

const LEDGER_ENTRIES_QUERY = `
  query LedgerEntries(
    $journal: String, $accountingPeriod: ID, $party: ID, $funder: ID,
    $sourceEventType: String, $first: Int, $after: String
  ) {
    ledgerEntries(
      journal: $journal, accountingPeriod: $accountingPeriod, party: $party,
      funder: $funder, sourceEventType: $sourceEventType, first: $first, after: $after
    ) {
      totalCount
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      edges {
        node {
          id journal { code name } accountingPeriod { id status }
          sourceEventType sourceEventReference postedAt
          lines: legs {
            id account { code name } debit credit
            partyTag { analyticValueId displayName }
            funderTag { analyticValueId displayName }
          }
        }
      }
    }
  }
`;

const ACCOUNTING_PERIODS_QUERY = `
  query AccountingPeriods($status: String) {
    accountingPeriods(status: $status) {
      id startDate endDate status closingTransactionId lockedAt closedAt closedBy
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
  query AnalyticValues($search: String!, $tagType: String!) {
    analyticValues(search: $search, tagType: $tagType) {
      analyticValueId partyType funderCode displayName externalReference
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
const analyticId = (id) => mockId("AnalyticValue", id);
const ALL_PERIODS_FILTER_VALUE = "__all__";

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

const MOCK_PARTIES = [
  {
    analyticValueId: analyticId("HF-1"),
    partyType: "health_facility",
    displayName: "District Hospital",
    externalReference: "HF-1",
  },
  {
    analyticValueId: analyticId("HF-2"),
    partyType: "health_facility",
    displayName: "Urban Clinic",
    externalReference: "HF-2",
  },
  {
    analyticValueId: analyticId("HF-3"),
    partyType: "health_facility",
    displayName: "Rural Health Center",
    externalReference: "HF-3",
  },
  {
    analyticValueId: analyticId("FAM-1"),
    partyType: "insuree_family",
    displayName: "Family Doe",
    externalReference: "FAM-1",
  },
  {
    analyticValueId: analyticId("FAM-2"),
    partyType: "insuree_family",
    displayName: "Family Smith",
    externalReference: "FAM-2",
  },
  {
    analyticValueId: analyticId("PPM-1"),
    partyType: "payment_point_manager",
    displayName: "Payment Point Manager A",
    externalReference: "PPM-1",
  },
  {
    analyticValueId: analyticId("PPM-2"),
    partyType: "payment_point_manager",
    displayName: "Payment Point Manager B",
    externalReference: "PPM-2",
  },
];

const MOCK_FUNDERS = [
  { analyticValueId: analyticId("GIZ"), funderCode: "GIZ", displayName: "GIZ", externalReference: "GIZ" },
  { analyticValueId: analyticId("WB"), funderCode: "WB", displayName: "World Bank", externalReference: "WB" },
  { analyticValueId: analyticId("UNICEF"), funderCode: "UNICEF", displayName: "UNICEF", externalReference: "UNICEF" },
];

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
    dispatch({
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: { data: { accountingPeriods: MOCK_ACCOUNTING_PERIODS } },
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

export function searchPartyMock(searchTerm) {
  return (dispatch) => {
    const term = String(searchTerm || "").toLowerCase().trim();
    const results = !term
      ? MOCK_PARTIES
      : MOCK_PARTIES.filter(
          (party) =>
            party.displayName.toLowerCase().includes(term) ||
            party.analyticValueId.toLowerCase().includes(term) ||
            party.externalReference.toLowerCase().includes(term),
        );
    dispatch({ type: `${ACTION_TYPE.PARTY_SEARCH}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
      payload: { data: { analyticValues: results } },
    });
  };
}

export function searchFunderMock(searchTerm) {
  return (dispatch) => {
    const term = String(searchTerm || "").toLowerCase().trim();
    const results = !term
      ? MOCK_FUNDERS
      : MOCK_FUNDERS.filter(
          (funder) =>
            funder.displayName.toLowerCase().includes(term) ||
            funder.analyticValueId.toLowerCase().includes(term) ||
            funder.externalReference.toLowerCase().includes(term),
        );
    dispatch({ type: `${ACTION_TYPE.FUNDER_SEARCH}_REQ` });
    dispatch({
      type: `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
      payload: { data: { analyticValues: results } },
    });
  };
}

/**
 * Dispatches the LedgerEntries query (US1, FR-001). `filters` uses the
 * frontend view-model names from data-model.md's `LedgerEntryFilters`
 * (`accountingPeriodId`, `partyAnalyticValueId`, `funderAnalyticValueId`),
 * translated here to the backend's GraphQL argument names
 * (`accountingPeriod`, `party`, `funder`) per contracts/graphql-operations.md.
 *
 * Per FR-001 / data-model.md's client-side validation rule, when
 * `filters.accountingPeriodId` is not explicitly set, this defaults to the
 * current open accounting period's id (read from `state.ledger.accountingPeriods`)
 * rather than sending an unscoped query.
 */
export function fetchLedgerEntries(filters = {}, pageInfo = {}) {
  return async (dispatch, getState) => {
    let accountingPeriodId = filters.accountingPeriodId;
    if (accountingPeriodId === undefined) {
      const openPeriod = getState().ledger?.accountingPeriods?.items?.find((period) => period.status === "open");
      accountingPeriodId = openPeriod?.id ?? null;
    }

    const resolvedFilters = { ...filters, accountingPeriodId };

    const variables = {
      journal: filters.journal ?? null,
      accountingPeriod: accountingPeriodId,
      party: filters.partyAnalyticValueId ?? null,
      funder: filters.funderAnalyticValueId ?? null,
      sourceEventType: filters.sourceEventType ?? null,
      first: pageInfo.first ?? null,
      after: pageInfo.after ?? null,
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
export function fetchAccountingPeriods(status = null) {
  const variables = { status };
  return graphqlWithVariables(ACCOUNTING_PERIODS_QUERY, variables, [
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ`,
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
    `${ACTION_TYPE.ACCOUNTING_PERIODS}_ERR`,
  ]);
}

/** User Story 2 — unified party search across party types (research.md §6). */
export function searchParty(searchTerm) {
  const variables = { search: searchTerm, tagType: "party" };
  return graphqlWithVariables(ANALYTIC_VALUES_QUERY, variables, [
    `${ACTION_TYPE.PARTY_SEARCH}_REQ`,
    `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
    `${ACTION_TYPE.PARTY_SEARCH}_ERR`,
  ]);
}

/** User Story 2 — signed running balance + period statement for one party. */
export function fetchPartyLedgerBalance(analyticValueId, accountingPeriodId) {
  const variables = { analyticValueId, accountingPeriod: accountingPeriodId };
  return graphqlWithVariables(PARTY_LEDGER_BALANCE_QUERY, variables, [
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_REQ`,
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
    `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_ERR`,
  ]);
}

/** User Story 3 — unified funder search (same AnalyticValue index, tagType "funder"). */
export function searchFunder(searchTerm) {
  const variables = { search: searchTerm, tagType: "funder" };
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
    const tick = async () => {
      await dispatch(fetchExportSequences(accountingPeriodId));
      const status = getState().ledger?.exportJobs?.byPeriodId?.[accountingPeriodId]?.status;
      if (status === "complete" || status === "failed") {
        clearInterval(intervalId);
      }
    };
    tick();
    const intervalId = setInterval(tick, intervalMs);
    return () => clearInterval(intervalId);
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
