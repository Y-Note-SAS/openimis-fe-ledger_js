# Phase 1 Data Model: Ledger & Double-Entry Accounting Frontend

This is the **frontend-side** shape of the data this module handles: Redux state slices populated from GraphQL responses, and the client-side view models components render from. Authoritative field semantics/validation live server-side; see `openimis-be-ledger_py/specs/001-ledger-double-entry-accounting/data-model.md` for the backend entities this maps onto (referenced inline below).

## Redux state shape (`state.ledger`)

```text
state.ledger = {
  // User Story 1 — General Ledger Browser
  ledgerEntries: {
    isFetching, isFetched, error,
    items: [LedgerEntryViewModel],
    pageInfo: { totalCount, hasNextPage, hasPreviousPage, startCursor, endCursor },
    filters: LedgerEntryFilters,          // last-submitted filter state, incl. default current-open-period scope
  },

  // User Story 2 — Party Sub-Ledger
  partySearch: { isFetching, isFetched, error, results: [PartyResultViewModel] },
  partyLedgerBalance: { isFetching, isFetched, error, data: PartyLedgerBalanceViewModel | null },

  // User Story 3 — Funder Activity
  funderSearch: { isFetching, isFetched, error, results: [FunderResultViewModel] },
  funderActivityReport: { isFetching, isFetched, error, data: FunderActivityViewModel | null },

  // User Story 4 — Accounting Periods
  accountingPeriods: { isFetching, isFetched, error, items: [AccountingPeriodViewModel] },
  periodMutation: { submitting, error, lastRejectionReason },   // shared by open/lock/close/reopen

  // User Story 5 — Manual Review Queue
  manualReviewQueue: { isFetching, isFetched, error, items: [ManualReviewItemViewModel] },
  reviewResolution: { submitting, error },

  // User Story 6 — Period Export
  exportJobs: { byPeriodId: { [periodId]: ExportJobViewModel } },  // polled while status === "in_progress"

  // User Story 7 — Deployment Configuration
  deploymentConfiguration: { isFetching, isFetched, error, data: DeploymentConfigurationViewModel | null, submitting },

  // Reference data for pickers
  externalSystems: { isFetching, isFetched, error, items: [{ code, label }] },  // FR-017 extensible list
  currencyCodes: { isFetching, isFetched, error, items: [{ code, label }] },     // FR-017 extensible list
  chartOfAccounts: { isFetching, isFetched, error, items: [{ id, code, name }] }, // FR-017 retained-earnings picker
}
```

## View models

### `LedgerEntryFilters`
Client-side filter state passed to `ledgerEntries`; shared shape consumed by both `LedgerFilters` (baseline) and `LedgerFiltersSvar` (deferred) per research.md §4.
- `journal: string | null`
- `accountingPeriodId: string | null` — defaults to the current open period's id (FR-001) until the user broadens it
- `partyAnalyticValueId: string | null`
- `funderAnalyticValueId: string | null`
- `sourceEventType: enum(claim_payment | invoice | payroll_disbursement | payment_point_reconciliation | closing_entry | correction) | null`

### `LedgerEntryViewModel`
Maps 1:1 to backend `LedgerEntryMeta` (+ its Hordak `Transaction`/`Leg`s), the frontend's "Ledger Entry".
- `id`, `journal: { code, name }`, `accountingPeriod: { id, status }`, `sourceEventType`, `sourceEventReference`, `postedAt`
- `lines: [{ id, account: { code, name }, debit: number | null, credit: number | null, partyTag: {analyticValueId, displayName} | null, funderTag: {analyticValueId, displayName} | null }]`
- `totals: { debit, credit, balance }` — computed client-side from `lines` for FR-002's visual balance confirmation and the tree-row group subtotal (FR-023); MUST equal `debit === credit` (`balance === 0`) for a valid posted entry — a non-zero `balance` here indicates a rendering/mapping bug, not a legitimate business state, since the backend/Hordak enforces the invariant server-side.

### `PartyResultViewModel` / `FunderResultViewModel`
- `analyticValueId`, `partyType | funderCode`, `displayName`, `externalReference`

### `PartyLedgerBalanceViewModel`
Maps to backend `PartyLedgerBalance`.
- `analyticValueId`, `accountingPeriodId`
- `debitTotal`, `creditTotal`, `balance` (signed: positive = owed by the party, negative = owed to the party, per Clarifications)
- `transactions: [LedgerEntryViewModel]` (period statement lines)
- `carriedForwardBalance: number | null` — shown in the empty-state per Edge Cases

### `FunderActivityViewModel`
Maps to the backend's funder-axis aggregation (mirrors `PartyLedgerBalance`'s approach per the backend contract).
- `analyticValueId`, `accountingPeriodRange: { start, end }`
- `debitTotal`, `creditTotal`, `balance`
- `byCategory: [{ category, debit, credit, balance }]` — "aggregated activity figures (e.g., totals by category/period)" per spec Acceptance Scenario

### `AccountingPeriodViewModel`
Maps to backend `AccountingPeriod`.
- `id`, `startDate`, `endDate`, `status: enum(open | locked | closed)`
- `closingTransactionId: string | null`, `lockedAt`, `closedAt`, `closedBy`
- Client-derived: `availableActions: Array<"lock" | "close" | "reopen">` — computed from `status` + whether this is the chronologically-earliest open/locked period (mirrors backend rule so buttons are pre-disabled, but the backend's actual mutation response is still authoritative — see FR-009)

### `ManualReviewItemViewModel`
Maps to backend `ManualReviewQueueItem` (+ its `ExternalReplicationRecord`).
- `id`, `status: enum(pending | resolved)`, `createdAt`
- `rejectionReason`, `targetSystem: enum(odoo | sage)`
- `originalEntry: { id, partyAnalyticValueId, accountingPeriodId }` — used to scope the correcting-entry picker to same party+period (Clarifications)
- `resolvedAt: string | null`, `resolutionNote: string | null`, `correctingEntryId: string | null`

### `ExportJobViewModel`
Maps to the backend's async export job/reference (see `exportAccountingPeriod` mutation + `exportSequences` query).
- `accountingPeriodId`, `format: enum(ohada_fec | generic)`
- `status: enum(in_progress | complete | failed)`
- `provisional: boolean` — true while `accountingPeriod.status !== 'closed'` (FR-016)
- `downloadUrl: string | null` (set on `complete`), `failureMessage: string | null` (set on `failed`)

### `DeploymentConfigurationViewModel`
Maps to backend `DeploymentConfiguration`.
- `operatingMode: enum(local_only | replicated)`
- `externalSystem: string | null` — one of `externalSystems` reference-data codes (FR-017)
- `currencyCode: string` — one of `currencyCodes` reference-data codes (FR-017)
- `retainedEarningsAccount: { id, code, name }` — selected from `chartOfAccounts` (FR-017)

## Client-side validation rules

- `LedgerEntryFilters.accountingPeriodId` is never sent as `null` to `ledgerEntries` unless the user has explicitly cleared the period filter — the default value on first load is always the current open period's id (FR-001).
- Manual review resolution UI only lists `LedgerEntryViewModel`s from `ledgerEntries` filtered to `partyAnalyticValueId === originalEntry.partyAnalyticValueId && accountingPeriodId === originalEntry.accountingPeriodId` as candidates for `correctingEntryId` (Clarifications) — this is a UX-level pre-filter; the backend mutation remains the authoritative validator (Edge Cases).
- `DeploymentConfigurationViewModel` form submission is blocked client-side until the forward-only warning dialog (`ForwardOnlyModeWarningDialog`) has been explicitly acknowledged when `operatingMode` differs from the currently-saved value (FR-018, SC-007).
- No component in this module ever renders an editable form bound to an existing `LedgerEntryViewModel` — `LedgerEntryGrid`/`LedgerEntryGridSvar` are read-only by construction (FR-012).
