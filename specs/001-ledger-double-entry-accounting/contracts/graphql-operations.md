# Contract: GraphQL Operations Consumed by `@openimis/fe-ledger`

Source of truth for these shapes: `openimis-be-ledger_py/specs/001-ledger-double-entry-accounting/{contracts/graphql-api.md,data-model.md}` (backend design contract — backend implementation is currently a stub; see research.md §2 for the cross-repo risk this implies). All operations below are dispatched via `@openimis/fe-core`'s `graphql()`/`graphqlWithVariables()`/`formatMutation()` helpers per research.md §1, not `@apollo/client`.

## Queries

### `ledgerEntries` — User Story 1
```graphql
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
```
Dispatched by `actions.js#fetchLedgerEntries(filters, pageInfo)`; default `accountingPeriod` is the current open period's id when the user has not set a period filter (FR-001).

### `partyLedgerBalance` — User Story 2
```graphql
query PartyLedgerBalance($analyticValueId: ID!, $accountingPeriod: ID!) {
  partyLedgerBalance(analyticValueId: $analyticValueId, accountingPeriod: $accountingPeriod) {
    analyticValueId accountingPeriodId debitTotal creditTotal balance carriedForwardBalance
    transactions {
      id journal { code name } postedAt sourceEventType sourceEventReference
      lines: legs { id account { code name } debit credit }
    }
  }
}
```
Balance sign convention (positive = owed by party, negative = owed to party) is applied as-returned by the backend, not recomputed client-side.

### `funderActivityReport` — User Story 3
```graphql
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
```

### `accountingPeriods` — User Story 4
```graphql
query AccountingPeriods($status: String) {
  accountingPeriods(status: $status) {
    id startDate endDate status closingTransactionId lockedAt closedAt closedBy
  }
}
```

### `manualReviewQueue` — User Story 5
```graphql
query ManualReviewQueue($status: String) {
  manualReviewQueue(status: $status) {
    id status createdAt rejectionReason targetSystem
    originalEntry { id partyAnalyticValueId accountingPeriodId }
    resolvedAt resolutionNote correctingEntryId
  }
}
```

### `exportSequences` — User Story 6 (job status polling)
```graphql
query ExportSequences($accountingPeriod: ID!, $journal: String) {
  exportSequences(accountingPeriod: $accountingPeriod, journal: $journal) {
    accountingPeriodId format status provisional downloadUrl failureMessage
  }
}
```
Polled by `actions.js#pollExportJob(accountingPeriodId)` at a fixed interval while `status === "in_progress"` (research.md §5); interval cleared on unmount or terminal status (`complete`/`failed`).

### Reference-data queries — User Story 7
```graphql
query LedgerDeploymentReferenceData {
  externalSystems { code label }
  currencyCodes { code label }
  chartOfAccounts { id code name }
  deploymentConfiguration { operatingMode externalSystem currencyCode retainedEarningsAccount { id code name } }
}
```
`externalSystems`/`currencyCodes` are rendered exactly as returned — no hardcoded option list in the frontend (Clarifications).

## Mutations

### `openAccountingPeriod`
```graphql
mutation OpenAccountingPeriod($startDate: Date!, $endDate: Date!) {
  openAccountingPeriod(startDate: $startDate, endDate: $endDate) {
    clientMutationId
    accountingPeriod { id startDate endDate status }
    errors { field message }
  }
}
```

### `lockAccountingPeriod` / `closeAccountingPeriod` / `reopenAccountingPeriod`
```graphql
mutation LockAccountingPeriod($accountingPeriodId: ID!) {
  lockAccountingPeriod(accountingPeriodId: $accountingPeriodId) {
    clientMutationId
    accountingPeriod { id status lockedAt }
    errors { field message }
  }
}
# closeAccountingPeriod / reopenAccountingPeriod follow the identical shape,
# swapping the mutation name and returned timestamp field (closedAt / — none —).
```
`errors[].message` is the backend's specific rejection reason (FR-009) — rendered verbatim, never replaced with a generic string.

### `resolveManualReviewItem`
```graphql
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
```
`correctingTransactionId` is only ever populated in the UI from entries pre-filtered to the same party+period as `originalEntry` (Clarifications; data-model.md client-side validation rules) — the backend remains the authoritative validator per Edge Cases.

### `exportAccountingPeriod`
```graphql
mutation ExportAccountingPeriod($accountingPeriodId: ID!, $format: String!) {
  exportAccountingPeriod(accountingPeriodId: $accountingPeriodId, format: $format) {
    clientMutationId
    exportJob { accountingPeriodId format status provisional }
    errors { field message }
  }
}
```
`format` is one of `ohada_fec | generic`, chosen by the user on every trigger (Clarifications) — never sourced from `deploymentConfiguration`.

### `configureDeployment`
```graphql
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
```
Only dispatched after `ForwardOnlyModeWarningDialog` acknowledgement when `operatingMode` changes (FR-018).

## Access control mapping

Per spec FR-019/FR-020 and the backend's own `graphql-api.md` §"Access control":
- **Read-only queries** (`ledgerEntries`, `partyLedgerBalance`, `funderActivityReport`, `accountingPeriods` read, `manualReviewQueue` read-only view, `exportSequences`): gated on `RIGHT_LEDGER_REPORTING` (provisional constant — research.md §3).
- **All mutations** + deployment-configuration read: gated on `RIGHT_LEDGER_ADMIN` (provisional constant — research.md §3).
