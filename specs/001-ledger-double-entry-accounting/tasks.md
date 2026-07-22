---

description: "Task list template for feature implementation"
---

# Tasks: Ledger & Double-Entry Accounting Frontend

**Input**: Design documents from `/specs/001-ledger-double-entry-accounting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-operations.md, quickstart.md

**Tests**: Included — the repository's `CLAUDE.md` unit-testing policy ("All new functions must be unit tested") is binding project-wide, so every reducer case, action creator, and non-trivial logic function gets a unit test task.

**Organization**: Tasks are grouped by user story (spec.md P1–P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single-package frontend module (plan.md "Structure Decision"): `src/` and `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization matching the `openimis-fe-*` module convention (plan.md, research.md §1)

- [ ] T001 Create `package.json` for `@openimis/fe-ledger` (name, `main`/`module`: `src/index.jsx`, `vite build`/`vite` scripts, peerDeps `react`/`react-dom`/`react-intl`/`react-router-dom`/`redux`/`redux-api-middleware`/`@mui/material`/`@mui/icons-material`/`@emotion/react`/`@emotion/styled`/`lodash`, dependency `@openimis/fe-core: file:../openimis-fe-core_js`, devDependencies mirroring `openimis-fe-claim_js/package.json` (`vite`, `@vitejs/plugin-react`, `prettier`, `prop-types`, babel toolchain), and Jest + React Testing Library devDependencies for the test suite)
- [ ] T002 [P] Create `vite.config.js` at repository root mirroring `openimis-fe-claim_js`'s Vite build config for a library build
- [ ] T003 [P] Create `jest.config.js` at repository root configuring Jest + React Testing Library against `src/`
- [ ] T004 [P] Configure Prettier (`.prettierrc`) matching sibling `openimis-fe-*` module formatting conventions
- [ ] T005 Create empty scaffold files: `src/index.jsx`, `src/constants.js`, `src/reducer.js`, `src/actions.js`, `src/translations/en.json` (each with a minimal valid stub so later tasks append rather than create)

**Checkpoint**: Project builds (`npm run build` produces no errors on the empty scaffold)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constants, module factory skeleton, permission gating, and cross-story pickers/utilities that every user story phase depends on (plan.md Project Structure; data-model.md; research.md §3, §6)

**⚠️ CRITICAL**: No user story phase may begin until this phase is complete

- [ ] T006 Define `MODULE_NAME = "ledger"`, provisional `RIGHT_LEDGER_REPORTING` and `RIGHT_LEDGER_ADMIN` right constants (flagged with a code comment referencing research.md §3's provisional-pending-backend caveat), and the `sourceEventType`/period-`status`/export-`format`/replication-`targetSystem` enum constants (mirroring backend `data-model.md`) in `src/constants.js`
- [ ] T007 [P] Write unit test for right-constant shape/uniqueness in `tests/constants.test.js`
- [ ] T008 Implement the `LedgerModule(cfg)` factory skeleton in `src/index.jsx` (`DEFAULT_CONFIG` with empty `translations`/`reducers`/`refs`/`core.Router`/`core.MainMenu` arrays, spread-merged with `cfg`, per `openimis-fe-claim_js/src/index.jsx`'s pattern) — later phases append entries, not restructure this file
- [ ] T009 Implement base `reducer.js` initial state shape from data-model.md's "Redux state shape" section (all slices present with `isFetching: false, isFetched: false, error: null` defaults, empty arrays/nulls for data) in `src/reducer.js`
- [ ] T010 [P] Write unit test asserting the reducer's initial state matches data-model.md's documented shape in `tests/reducer.test.js`
- [ ] T011 Implement `src/utils/permissions.js` exporting `hasLedgerReportingRight(rights)` / `hasLedgerAdminRight(rights)` helpers used by every page/menu for FR-019/FR-020 gating
- [ ] T012 [P] Write unit test for `hasLedgerReportingRight`/`hasLedgerAdminRight` in `tests/utils/permissions.test.js`
- [ ] T013 [P] Implement `AccountingPeriodPicker` (period dropdown, sourced from `state.ledger.accountingPeriods`) in `src/pickers/AccountingPeriodPicker.jsx` — shared by US1, US2, US4, US6
- [ ] T014 [P] Implement `LedgerJournalPicker` in `src/pickers/LedgerJournalPicker.jsx` — used by US1 filters
- [ ] T015 Implement the `accountingPeriods` fetch action creator (`fetchAccountingPeriods(status)` via `graphqlWithVariables`, per contracts/graphql-operations.md `AccountingPeriods` query) and its `_REQ`/`_RESP`/`_ERR` reducer cases in `src/actions.js` / `src/reducer.js` — needed by `AccountingPeriodPicker` (T013) and US4
- [ ] T016 [P] Write unit test for the `accountingPeriods` action creator + reducer cases in `tests/actions.test.js` / `tests/reducer.test.js`
- [ ] T017 Register base translations (`mainMenu`, common labels: period status names, source-event-type labels) in `src/translations/en.json`

**Checkpoint**: Foundation ready — `LedgerModule(cfg)` mounts in a host shell with an empty menu; period picker/right-check utilities are testable in isolation; user story implementation can now begin

---

## Phase 3: User Story 1 - Browse the General Ledger (Priority: P1) 🎯 MVP

**Goal**: Finance staff can open a paginated, filterable general ledger browser, see balanced debit/credit lines grouped into expandable tree rows with subtotals, and trace any entry to its source event (spec.md US1).

**Independent Test**: Open the ledger browser, apply a filter combination, confirm pagination and balanced expandable entries with source-event links render correctly (quickstart.md scenario 1).

### Tests for User Story 1

- [ ] T018 [P] [US1] Unit test for `ledgerEntries` action creator (request/success/error) in `tests/actions.test.js`
- [ ] T019 [P] [US1] Unit test for `LEDGER_ENTRIES_*` reducer cases (incl. default-period-filter behavior, FR-001) in `tests/reducer.test.js`
- [ ] T020 [P] [US1] Unit test for per-entry debit/credit/balance subtotal computation in `tests/utils/ledgerEntryTotals.test.js`
- [ ] T021 [P] [US1] Component test asserting `LedgerEntryGrid` renders balanced totals and expand/collapse behavior (data-model.md `LedgerEntryViewModel`) in `tests/components/LedgerEntryGrid.test.js`

### Implementation for User Story 1

- [ ] T022 [US1] Implement `fetchLedgerEntries(filters, pageInfo)` action creator dispatching the `LedgerEntries` GraphQL query (contracts/graphql-operations.md) via `graphqlWithVariables`, defaulting `accountingPeriod` to the current open period per FR-001, in `src/actions.js`
- [ ] T023 [US1] Implement `LEDGER_ENTRIES_REQ`/`_RESP`/`_ERR` reducer cases populating `state.ledger.ledgerEntries` (items, pageInfo, filters) per data-model.md in `src/reducer.js`
- [ ] T024 [US1] Implement `src/utils/ledgerEntryTotals.js` exporting a pure function computing `{ debit, credit, balance }` from a `LedgerEntryViewModel.lines` array (data-model.md validation rule: `balance === 0` for a valid entry)
- [ ] T025 [P] [US1] Implement the baseline expandable/collapsible `LedgerEntryGrid` component (MUI `Table`/`Collapse`-based tree rows, group subtotals via T024) in `src/components/LedgerEntryGrid.jsx` — satisfies FR-023's baseline requirement
- [ ] T026 [P] [US1] Implement the baseline `LedgerFilters` component (journal, accounting period, party, funder, source-event-type controls using standard MUI inputs and the pickers from Phase 2) in `src/components/LedgerFilters.jsx` — satisfies FR-001a's baseline requirement
- [ ] T027 [US1] Implement `GeneralLedgerPage` wiring `LedgerFilters` + `LedgerEntryGrid` + pagination controls + permission gate (`hasLedgerReportingRight`) in `src/pages/GeneralLedgerPage.jsx`
- [ ] T028 [US1] Register the `/ledger/general` route, `LedgerMainMenu` entry (permission-filtered), and `ledger` reducer key in `src/index.jsx`'s `DEFAULT_CONFIG`
- [ ] T029 [US1] Add source-event-reference link rendering (distinguishable by `sourceEventType`, FR-003) inside `LedgerEntryGrid.jsx`
- [ ] T030 [US1] Add US1-specific translation keys (filter labels, column headers, source-event-type labels) to `src/translations/en.json`

**Checkpoint**: User Story 1 fully functional and independently testable — MVP deliverable

---

## Phase 4: User Story 2 - Review a Party's Sub-Ledger (Priority: P1)

**Goal**: Finance staff can search any party across all three party types via a single search box and view a signed running balance and per-period statement (spec.md US2).

**Independent Test**: Search a known party, select a period, confirm the running balance and statement match; confirm the no-activity empty state shows a carried-forward balance (quickstart.md scenario 2).

### Tests for User Story 2

- [ ] T031 [P] [US2] Unit test for `partySearch`/`partyLedgerBalance` action creators in `tests/actions.test.js`
- [ ] T032 [P] [US2] Unit test for corresponding reducer cases in `tests/reducer.test.js`
- [ ] T033 [P] [US2] Unit test for `src/utils/balance.js`'s signed-balance + legend formatting (positive = owed by party, negative = owed to party) in `tests/utils/balance.test.js`

### Implementation for User Story 2

- [ ] T034 [US2] Implement `src/utils/balance.js` exporting `formatSignedBalance(balance)` returning `{ label, legend }` per the Clarifications sign convention
- [ ] T035 [US2] Implement `searchParty(searchTerm)` action creator (unified search across party types) and `PARTY_SEARCH_*` reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T036 [US2] Implement `fetchPartyLedgerBalance(analyticValueId, accountingPeriodId)` action creator (contracts/graphql-operations.md `PartyLedgerBalance` query) and `PARTY_LEDGER_BALANCE_*` reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T037 [P] [US2] Implement `PartyPicker` (unified search box, results annotated by party type per FR-004) in `src/pickers/PartyPicker.jsx`
- [ ] T038 [US2] Implement `PartyLedgerPage` wiring `PartyPicker` + `AccountingPeriodPicker` + statement table + signed-balance display (via `formatSignedBalance`) + carried-forward-balance empty state, gated by `hasLedgerReportingRight`, in `src/pages/PartyLedgerPage.jsx`
- [ ] T039 [US2] Register the `/ledger/party` route and menu entry in `src/index.jsx`
- [ ] T040 [US2] Add US2-specific translation keys (balance legend text, empty-state copy) to `src/translations/en.json`

**Checkpoint**: User Stories 1 AND 2 both independently functional

---

## Phase 5: User Story 3 - View Funder Activity/Profitability (Priority: P2)

**Goal**: Finance staff/administrators can look up a funder and see aggregated activity independent of party tagging (spec.md US3).

**Independent Test**: Search and select a funder, confirm aggregated figures render independent of any party filter (quickstart.md scenario 3).

### Tests for User Story 3

- [ ] T041 [P] [US3] Unit test for `funderSearch`/`funderActivityReport` action creators in `tests/actions.test.js`
- [ ] T042 [P] [US3] Unit test for corresponding reducer cases in `tests/reducer.test.js`

### Implementation for User Story 3

- [ ] T043 [US3] Implement `searchFunder(searchTerm)` action creator and `FUNDER_SEARCH_*` reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T044 [US3] Implement `fetchFunderActivityReport(analyticValueId, periodRange)` action creator (contracts/graphql-operations.md `FunderActivityReport` query) and `FUNDER_ACTIVITY_REPORT_*` reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T045 [P] [US3] Implement `FunderPicker` in `src/pickers/FunderPicker.jsx`
- [ ] T046 [US3] Implement `FunderActivityPage` wiring `FunderPicker` + period-range controls + `byCategory` breakdown table, gated by `hasLedgerReportingRight`, in `src/pages/FunderActivityPage.jsx`
- [ ] T047 [US3] Register the `/ledger/funder` route and menu entry in `src/index.jsx`
- [ ] T048 [US3] Add US3-specific translation keys to `src/translations/en.json`

**Checkpoint**: User Stories 1, 2, AND 3 independently functional

---

## Phase 6: User Story 4 - Manage Accounting Periods (Priority: P1)

**Goal**: Finance administrators can open/lock/close/reopen accounting periods with chronological-order enforcement and backend rejection reasons surfaced verbatim (spec.md US4).

**Independent Test**: Open a period, attempt lifecycle actions in/out of valid order, confirm disabled actions and rejection reasons behave correctly; confirm reporting-only users see statuses but no controls (quickstart.md scenario 4).

### Tests for User Story 4

- [ ] T049 [P] [US4] Unit test for `openAccountingPeriod`/`lockAccountingPeriod`/`closeAccountingPeriod`/`reopenAccountingPeriod` action creators (incl. rejection-reason propagation) in `tests/actions.test.js`
- [ ] T050 [P] [US4] Unit test for `AccountingPeriodViewModel.availableActions` derivation logic (earliest-open/locked-period rule) in `tests/utils/periodActions.test.js`
- [ ] T051 [P] [US4] Component test for `AccountingPeriodStatusBadge` rendering each status in `tests/components/AccountingPeriodStatusBadge.test.js`

### Implementation for User Story 4

- [ ] T052 [US4] Implement `src/utils/periodActions.js` exporting `availableActionsForPeriod(period, allPeriods)` → `Array<"lock"|"close"|"reopen">` per data-model.md's derived field
- [ ] T053 [US4] Implement `openAccountingPeriod(startDate, endDate)` mutation action creator (contracts/graphql-operations.md) and `OPEN_ACCOUNTING_PERIOD_*` reducer cases (updating `periodMutation` + appending to `accountingPeriods.items` on success) in `src/actions.js` / `src/reducer.js`
- [ ] T054 [US4] Implement `lockAccountingPeriod(id)` / `closeAccountingPeriod(id)` / `reopenAccountingPeriod(id)` mutation action creators and their reducer cases (each surfacing `errors[].message` verbatim into `periodMutation.lastRejectionReason` per FR-009) in `src/actions.js` / `src/reducer.js`
- [ ] T055 [P] [US4] Implement `AccountingPeriodStatusBadge` component (open/locked/closed visual states) in `src/components/AccountingPeriodStatusBadge.jsx`
- [ ] T056 [US4] Implement `AccountingPeriodsPage` — period list with status badges, open-period form, lock/close/reopen action buttons driven by `availableActionsForPeriod`, and a rejection-reason alert display; lifecycle controls gated by `hasLedgerAdminRight`, list itself visible under `hasLedgerReportingRight` per FR-020's read/write split, in `src/pages/AccountingPeriodsPage.jsx`
- [ ] T057 [US4] Register the `/ledger/periods` route and menu entry (list visible to reporting right, admin actions additionally gated in-page) in `src/index.jsx`
- [ ] T058 [US4] Add US4-specific translation keys (status labels, action labels, generic "action unavailable" copy) to `src/translations/en.json`

**Checkpoint**: User Stories 1, 2, 3, AND 4 independently functional

---

## Phase 7: User Story 5 - Resolve Manual Review Items (Priority: P2)

**Goal**: Finance administrators can review flagged items and resolve them by linking a same-party/same-period correcting entry with a note, without ever editing the original entry (spec.md US5).

**Independent Test**: Open the queue, resolve a pending item via a scoped correcting-entry picker, confirm resolution and read-only original entry; confirm reporting-only users are denied access (quickstart.md scenario 5).

### Tests for User Story 5

- [ ] T059 [P] [US5] Unit test for `manualReviewQueue`/`resolveManualReviewItem` action creators in `tests/actions.test.js`
- [ ] T060 [P] [US5] Unit test for the same-party/same-period correcting-entry candidate filter (data-model.md client-side validation rule) in `tests/utils/correctingEntryCandidates.test.js`
- [ ] T061 [P] [US5] Component test confirming `ManualReviewResolutionDialog` renders no edit affordance for the original entry in `tests/components/ManualReviewResolutionDialog.test.js`

### Implementation for User Story 5

- [ ] T062 [US5] Implement `fetchManualReviewQueue(status)` action creator (contracts/graphql-operations.md `ManualReviewQueue` query) and reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T063 [US5] Implement `src/utils/correctingEntryCandidates.js` exporting a pure function filtering fetched `ledgerEntries` items to `partyAnalyticValueId`+`accountingPeriodId` matching a given `ManualReviewItemViewModel.originalEntry`
- [ ] T064 [US5] Implement `resolveManualReviewItem(reviewItemId, correctingTransactionId, resolutionNote)` mutation action creator and `RESOLVE_MANUAL_REVIEW_ITEM_*` reducer cases (updating the item's `status`/`resolvedAt`/`resolutionNote` in `manualReviewQueue.items`) in `src/actions.js` / `src/reducer.js`
- [ ] T065 [P] [US5] Implement `ManualReviewResolutionDialog` (rejection-reason display, correcting-entry picker restricted via T063, resolution-note field, read-only original-entry summary with no edit controls per FR-012) in `src/components/ManualReviewResolutionDialog.jsx`
- [ ] T066 [US5] Implement `ManualReviewQueuePage` — pending/resolved list, opens `ManualReviewResolutionDialog`, gated entirely by `hasLedgerAdminRight` (FR-020) in `src/pages/ManualReviewQueuePage.jsx`
- [ ] T067 [US5] Register the `/ledger/manual-review` route and menu entry (admin-only) in `src/index.jsx`
- [ ] T068 [US5] Add US5-specific translation keys to `src/translations/en.json`

**Checkpoint**: User Stories 1–5 independently functional

---

## Phase 8: User Story 6 - Export an Accounting Period (Priority: P3)

**Goal**: Finance administrators can trigger a CSV export (chosen format per request), track job status without manual reload, download the file, and see provisional-vs-final numbering (spec.md US6).

**Independent Test**: Trigger an export, observe status progress to complete without reload, download the file, confirm provisional/final labeling matches period status (quickstart.md scenario 6).

### Tests for User Story 6

- [ ] T069 [P] [US6] Unit test for `exportAccountingPeriod` mutation action creator in `tests/actions.test.js`
- [ ] T070 [P] [US6] Unit test for the polling action creator's start/stop-on-terminal-status behavior in `tests/actions.test.js`
- [ ] T071 [P] [US6] Component test for `ExportJobStatus` rendering in-progress/complete/failed states and the provisional/final label in `tests/components/ExportJobStatus.test.js`

### Implementation for User Story 6

- [ ] T072 [US6] Implement `exportAccountingPeriod(accountingPeriodId, format)` mutation action creator (contracts/graphql-operations.md) and `EXPORT_ACCOUNTING_PERIOD_*` reducer cases populating `exportJobs.byPeriodId` in `src/actions.js` / `src/reducer.js`
- [ ] T073 [US6] Implement `pollExportJob(accountingPeriodId)` action creator — dispatches the `ExportSequences` query on a fixed interval (research.md §5) while status is `in_progress`, clearing the interval on `complete`/`failed`/unmount — and its reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T074 [P] [US6] Implement `ExportJobStatus` component (status display, provisional/final badge per FR-016, download link/button) in `src/components/ExportJobStatus.jsx`
- [ ] T075 [US6] Implement `PeriodExportPage` — period selector, format selector (OHADA/FEC vs. generic, chosen per trigger per Clarifications), trigger button, `ExportJobStatus`, wired to start/stop polling on mount/unmount, gated by `hasLedgerAdminRight`, in `src/pages/PeriodExportPage.jsx`
- [ ] T076 [US6] Register the `/ledger/export` route and menu entry (admin-only) in `src/index.jsx`
- [ ] T077 [US6] Add US6-specific translation keys (format labels, status labels, provisional/final copy) to `src/translations/en.json`

**Checkpoint**: User Stories 1–6 independently functional

---

## Phase 9: User Story 7 - Configure Deployment Settings (Priority: P3)

**Goal**: Finance administrators can view/set operating mode, external system, currency code, and retained earnings account, with a mandatory forward-only acknowledgement on mode change (spec.md US7).

**Independent Test**: Change operating mode, confirm the forward-only warning must be acknowledged before save; confirm reporting-only users are denied access (quickstart.md scenario 7).

### Tests for User Story 7

- [ ] T078 [P] [US7] Unit test for `configureDeployment` mutation action creator + reference-data fetch action creators in `tests/actions.test.js`
- [ ] T079 [P] [US7] Component test confirming `ForwardOnlyModeWarningDialog` blocks submission until acknowledged in `tests/components/ForwardOnlyModeWarningDialog.test.js`

### Implementation for User Story 7

- [ ] T080 [US7] Implement `fetchLedgerDeploymentReferenceData()` action creator (contracts/graphql-operations.md `LedgerDeploymentReferenceData` query: `externalSystems`, `currencyCodes`, `chartOfAccounts`, `deploymentConfiguration`) and reducer cases populating `externalSystems`/`currencyCodes`/`chartOfAccounts`/`deploymentConfiguration` in `src/actions.js` / `src/reducer.js`
- [ ] T081 [US7] Implement `configureDeployment(operatingMode, externalSystem, currencyCode, retainedEarningsAccountId)` mutation action creator and `CONFIGURE_DEPLOYMENT_*` reducer cases in `src/actions.js` / `src/reducer.js`
- [ ] T082 [P] [US7] Implement `ForwardOnlyModeWarningDialog` (explicit acknowledgement required before enabling save, per FR-018) in `src/components/ForwardOnlyModeWarningDialog.jsx`
- [ ] T083 [US7] Implement `DeploymentConfigurationPage` — operating-mode toggle, external-system/currency-code/retained-earnings-account dropdowns sourced from fetched reference data (no free text, per Clarifications), wired to `ForwardOnlyModeWarningDialog` on mode change, gated entirely by `hasLedgerAdminRight` (FR-020), in `src/pages/DeploymentConfigurationPage.jsx`
- [ ] T084 [US7] Register the `/ledger/configuration` route and menu entry (admin-only) in `src/index.jsx`
- [ ] T085 [US7] Add US7-specific translation keys (forward-only warning copy, field labels) to `src/translations/en.json`

**Checkpoint**: All 7 user stories independently functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple user stories; the spec's explicitly-deferred SVAR enhancement path (FR-001a, FR-023, research.md §4)

- [ ] T086 [P] Implement `LedgerFiltersSvar` (SVAR React Filter, svar.dev/react/filter) as a drop-in replacement for `LedgerFilters` sharing its `LedgerEntryFilters` props contract, activated via `modulesManager.getConf("fe-ledger", "useSvarComponents", false)`, in `src/components/LedgerFiltersSvar.jsx`
- [ ] T087 [P] Implement `LedgerEntryGridSvar` (SVAR DataGrid tree-rows) as a drop-in replacement for `LedgerEntryGrid` sharing its `LedgerEntryViewModel` props contract, same config flag, in `src/components/LedgerEntryGridSvar.jsx`
- [ ] T088 [P] Wire the `useSvarComponents` config flag into `GeneralLedgerPage.jsx` to select between baseline and SVAR component pairs
- [ ] T089 [P] Add `svar-datagrid`/`@svar/react-filter` as optional peer dependencies in `package.json` (not required for the baseline build, per research.md §4)
- [ ] T090 Run through `quickstart.md`'s 7 validation scenarios end-to-end against a mocked GraphQL backend (research.md §2's cross-repo dependency risk) and record results
- [ ] T091 [P] Add `prettier --check` and `jest` scripts wiring to a CI-equivalent `npm run verify` script in `package.json`
- [ ] T092 Review all `RIGHT_LEDGER_REPORTING`/`RIGHT_LEDGER_ADMIN` usages for the provisional-constant caveat (research.md §3) and leave a single consolidated TODO pointer in `src/constants.js` for backend right-ID reconciliation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–9)**: All depend on Foundational phase completion; stories are independently testable and may proceed in parallel or in priority order (US1/US2/US4 are P1, US3/US5 are P2, US6/US7 are P3)
- **Polish (Phase 10)**: Depends on all desired user stories being complete; the SVAR tasks (T086–T089) specifically depend on the baseline `LedgerFilters`/`LedgerEntryGrid` (US1, T025–T026) existing to share a props contract with

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on other stories
- **US2 (P1)**: Can start after Foundational — independent of US1, though both use `AccountingPeriodPicker` from Foundational
- **US3 (P2)**: Can start after Foundational — independent of US1/US2
- **US4 (P1)**: Can start after Foundational — independent; other stories read `accountingPeriods` state it manages but do not require US4's mutations to function read-only
- **US5 (P2)**: Can start after Foundational; T063's candidate filter reads `ledgerEntries` state populated by US1's T022/T023 — if US1 is not yet implemented, T063 can still be built and unit-tested against fixture data, but the page-level integration (T066) is most meaningfully validated after US1 ships
- **US6 (P3)**: Can start after Foundational — independent
- **US7 (P3)**: Can start after Foundational — independent

### Within Each User Story

- Tests before implementation (write and confirm failing first)
- Action creators + reducer cases before components
- Components before pages
- Page implementation before route/menu registration
- Translations last within each phase

### Parallel Opportunities

- All Setup [P] tasks (T002–T004) in parallel
- Foundational [P] tasks (T007, T010, T012, T013, T014, T016) in parallel once their non-parallel prerequisites (T006, T009, T011, T015) land
- Once Foundational completes, US1, US2, US3, US4, US6, US7 can all start in parallel across developers; US5 can start in parallel too but its page-level checkpoint benefits from US1 being done first
- Within each story, all `[P]`-marked test tasks run in parallel; all `[P]`-marked component/picker tasks run in parallel once their action-creator/reducer prerequisite lands

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for ledgerEntries action creator in tests/actions.test.js"
Task: "Unit test for LEDGER_ENTRIES_* reducer cases in tests/reducer.test.js"
Task: "Unit test for debit/credit/balance subtotal computation in tests/utils/ledgerEntryTotals.test.js"
Task: "Component test for LedgerEntryGrid in tests/components/LedgerEntryGrid.test.js"

# After T022-T024 land, launch UI tasks together:
Task: "Implement LedgerEntryGrid in src/components/LedgerEntryGrid.jsx"
Task: "Implement LedgerFilters in src/components/LedgerFilters.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (General Ledger Browser)
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 (General Ledger Browser) → validate → MVP demo
3. US2 (Party Sub-Ledger) + US4 (Accounting Periods) → validate → demo (completes the P1 set)
4. US3 (Funder Activity) + US5 (Manual Review Queue) → validate → demo (completes the P2 set)
5. US6 (Period Export) + US7 (Deployment Configuration) → validate → demo (completes the P3 set)
6. Phase 10 Polish (including the deferred SVAR enhancement path) → final hardening

### Parallel Team Strategy

With multiple developers, after Foundational completes:
- Developer A: US1 → US5 (both touch `ledgerEntries` state)
- Developer B: US2 → US3 (both are lookup+report pairs)
- Developer C: US4 → US6 (both are period-lifecycle-adjacent)
- Developer D: US7 (fully independent)

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to specific user story for traceability
- Every action creator and non-trivial utility function has a paired unit test task per `CLAUDE.md`'s repository-wide testing policy
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
