# Feature Specification: Ledger & Double-Entry Accounting Frontend

**Feature Branch**: `001-ledger-double-entry-accounting`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Build the frontend module for openIMIS's ledger/double-entry accounting backend (openimis-be-ledger_py, feature 001-ledger-double-entry-accounting), following openIMIS's openimis-fe-* React module conventions (menu registration, reducers, sagas, GraphQL via @apollo/client, Material-UI components matching the existing UI kit). The frontend must let finance staff and administrators use the backend's GraphQL surface (queries: ledgerEntries, partyLedgerBalance, funderActivityReport, accountingPeriods, manualReviewQueue, exportSequences; mutations: openAccountingPeriod, lockAccountingPeriod, closeAccountingPeriod, reopenAccountingPeriod, resolveManualReviewItem, exportAccountingPeriod, configureDeployment) through a clean UI covering: general ledger browser, party sub-ledger view, funder activity/profitability report, accounting period management, manual review queue, period export, and deployment configuration. Access control mirrors the backend: general ledger reporting permission grants read access to any party's/funder's data; period lifecycle, manual review resolution, and deployment configuration actions require a finance-administrator-level permission. Out of scope: multi-currency UI, multi-entity consolidation, budget line-item UI beyond the funder dimension."

## Clarifications

### Session 2026-07-22

- Q: When a finance administrator resolves a manual review item by linking a correcting entry, should the system restrict which entries can be selected as the "correcting entry"? → A: Correcting entry must belong to the same party and accounting period as the flagged item.
- Q: The party sub-ledger lookup covers three different party types (Insuree/Family, Health Facility, Payment Point Manager). Should the search be a single unified search box across all three types, or does the user pick a party type first? → A: Single search box across all party types; results show the type per match.
- Q: For period export, is the CSV format (OHADA/FEC vs. generic) chosen by the user each time they trigger an export, or fixed by deployment configuration? → A: User selects the format each time they trigger an export.
- Q: For the party sub-ledger balance, how should "owed vs. owed-to" be indicated to the user? → A: Signed number (positive = owed by party, negative = owed to party), with a legend explaining the convention.
- Q: When the general ledger browser is opened with no filters applied, should it default to showing entries from the current open accounting period only, or across all periods? → A: Default to the current open accounting period; user can broaden via filter.
- Q: Should the general ledger browser present entries as a flat list or as an expandable/collapsible hierarchy with debit/credit/balance subtotals at each level? → A: Expandable/collapsible tree rows (e.g., journal/entry → line), grouped with debit/credit/balance subtotals shown at each group level, implemented using the SVAR DataGrid framework's tree-row capability.
- Q: Should every filter control across the module (general ledger browser, party/funder lookups, period selection) use a consistent filtering mechanism? → A: Yes — all filter controls MUST be implemented using the SVAR React Filter component (https://svar.dev/react/filter/), for a consistent filter interaction across every screen.
- Q: Are the SVAR DataGrid tree rows and SVAR React Filter adoptions required for the initial delivery, given they require a dedicated GraphQL data-binding layer? → A: Optional for initial delivery — the module MUST ship with a functionally equivalent baseline (flat/expandable list, standard filter controls) first; SVAR DataGrid tree rows and SVAR React Filter are a deferred enhancement once the supporting GraphQL data-management layer exists.
- Q: For the "retained earnings account" field in deployment configuration, should it be selected from an existing chart-of-accounts list, or entered as free text? → A: Selected from a dropdown/lookup of existing chart-of-accounts entries, validated against the backend.
- Q: Is the "external system" choice in deployment configuration limited to exactly Odoo and Sage, or should the UI treat it as an extensible list? → A: UI renders whatever list of external systems the backend exposes (currently Odoo/Sage, but extensible); no hardcoded options.
- Q: Should the currency code field in deployment configuration be selected from a constrained list, or entered as free text? → A: Selected from a dropdown of valid currency codes exposed by the backend, not free text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the General Ledger (Priority: P1)

A finance staff member wants to review posted ledger entries to investigate a discrepancy, verify a specific transaction, or audit accounting activity. They open the general ledger browser, filter by journal, accounting period, party, funder, or source event type, and page through matching entries. For any entry, they see the balanced debit/credit lines and can trace the entry back to the originating openIMIS event (claim, invoice, payroll, or payment point transaction).

**Why this priority**: This is the foundational read capability that every other workflow depends on for context and verification; without it, no other screen is trustworthy or debuggable.

**Independent Test**: Can be fully tested by opening the ledger browser, applying at least one filter combination, confirming pagination works, and confirming each returned entry displays balanced debit/credit lines with a working link back to its source event.

**Acceptance Scenarios**:

1. **Given** a user with general ledger reporting permission, **When** they open the ledger browser without filters, **Then** they see a paginated list of ledger entries scoped to the current open accounting period by default, ordered by posting date/journal, most recent first, and can broaden the scope via the period filter.
2. **Given** a user has applied filters (accounting period + party), **When** the filters are submitted, **Then** only entries matching all selected filters are shown, and the active filters remain visible/editable.
3. **Given** a ledger entry with multiple debit/credit lines, **When** the user opens or expands the entry, **Then** the sum of debit lines equals the sum of credit lines, and each line shows its account and amount.
4. **Given** a ledger entry originated from a claim, invoice, payroll, or payment point event, **When** the user views the entry, **Then** a reference/link to that source event is shown and is distinguishable by event type.
5. **Given** the ledger browser results, **When** the user expands a group row (e.g., a journal or entry), **Then** its underlying lines are revealed as nested rows, and the group row displays subtotals for debit, credit, and balance computed from those lines.
6. **Given** an expanded group row, **When** the user collapses it, **Then** the nested lines are hidden again while the group-level debit/credit/balance subtotals remain visible.

---

### User Story 2 - Review a Party's Sub-Ledger (Priority: P1)

A finance staff member needs to know what a specific party (an Insuree/Family, a Health Facility, or a Payment Point Manager) currently owes or is owed. They search for the party, select an accounting period, and view a statement showing the party's running balance and the transactions contributing to it.

**Why this priority**: Party balance lookups are a core, frequent finance operation (e.g., reconciling a health facility's payables) and are independently valuable without any other screen.

**Independent Test**: Can be fully tested by searching for a known party, selecting a period, and confirming the displayed running balance matches the sum of that party's ledger entries for the period.

**Acceptance Scenarios**:

1. **Given** a user with general ledger reporting permission, **When** they search using a single search box (by name/identifier) spanning all party types, **Then** matching parties across Insuree/Family, Health Facility, and Payment Point Manager are listed together, each annotated with its type, regardless of who "owns" that party's data.
2. **Given** a selected party and accounting period, **When** the sub-ledger view loads, **Then** the user sees a statement of transactions for that period and a running/closing balance shown as a signed number (positive = owed by the party, negative = owed to the party), with a visible legend explaining the sign convention.
3. **Given** a party with no activity in a selected period, **When** the view loads, **Then** the user sees an explicit empty state with the carried-forward balance (if any) rather than an error.

---

### User Story 3 - View Funder Activity/Profitability (Priority: P2)

A finance staff member or administrator looks up a funder (a programme or donor) to see aggregated activity and profitability independent of individual party balances, in order to report to that funder or assess programme performance.

**Why this priority**: This serves external reporting obligations (to donors/programmes) and is used less frequently than day-to-day party lookups, but is high value and independently testable.

**Independent Test**: Can be fully tested by searching for a funder and confirming aggregated activity figures are displayed, independent of any party-level filter.

**Acceptance Scenarios**:

1. **Given** a user with general ledger reporting permission, **When** they search for and select a funder, **Then** aggregated activity figures (e.g., totals by category/period) for that funder are displayed.
2. **Given** a selected funder and accounting period range, **When** the report loads, **Then** figures reflect only entries tagged to that funder, independent of which party each entry also references.

---

### User Story 4 - Manage Accounting Periods (Priority: P1)

A finance administrator manages the lifecycle of accounting periods: opening a new period, locking a period to prevent further routine postings, closing a period to finalize it, and reopening a period when corrections are required. The system must prevent actions that violate chronological ordering and must clearly explain why an action was rejected.

**Why this priority**: Period lifecycle state gates nearly every other operation (posting, export finality, review resolution); it must exist early and be reliable for the rest of the module to make sense operationally.

**Independent Test**: Can be fully tested by opening a new period, then attempting to lock, close, and reopen periods in and out of valid order, confirming disabled actions and backend-surfaced rejection reasons behave correctly.

**Acceptance Scenarios**:

1. **Given** a finance administrator, **When** they view the period list, **Then** each period shows a clear status badge (open, locked, closed) and only actions valid for that status are enabled.
2. **Given** a finance administrator opens a new period, **When** the action succeeds, **Then** the new period appears in the list with "open" status.
3. **Given** a finance administrator attempts to lock/close/reopen a period out of chronological order, **When** the backend rejects the action, **Then** the specific rejection reason returned by the backend is displayed to the user.
4. **Given** a user without finance-administrator permission, **When** they view the period list, **Then** lifecycle action controls (open/lock/close/reopen) are not available to them, though they can still view period statuses if they hold general ledger reporting permission.

---

### User Story 5 - Resolve Manual Review Items (Priority: P2)

A finance administrator reviews a queue of items flagged for manual attention (e.g., replication rejections or unconfirmed postings), inspects the rejection reason, and resolves an item by linking it to an already-posted correcting entry with a resolution note. The original flagged entry is never editable.

**Why this priority**: Important for data integrity and closing the loop on exceptions, but affects a smaller volume of transactions than the core browsing/period workflows, so it follows those in priority.

**Independent Test**: Can be fully tested by opening the queue, selecting a pending item, linking it to an existing correcting entry with a note, and confirming the item moves to resolved status while the original entry remains unchanged and read-only.

**Acceptance Scenarios**:

1. **Given** a finance administrator, **When** they open the manual review queue, **Then** they see pending and resolved items with their rejection/flag reason and status.
2. **Given** a pending item, **When** the administrator selects a correcting entry and enters a resolution note, **Then** the item is marked resolved and shows the linked correcting entry and note.
3. **Given** a resolved or pending item, **When** the administrator views the original flagged entry, **Then** no edit controls are available for that entry.
4. **Given** a user without finance-administrator permission, **When** they attempt to access the manual review queue, **Then** access is denied.

---

### User Story 6 - Export an Accounting Period (Priority: P3)

A finance administrator triggers a CSV export (generic format) for an accounting period, tracks the resulting export job until it completes, and downloads the resulting file. The export clearly indicates whether the entry numbering is provisional (period still open) or final (period closed).

**Why this priority**: Export is a periodic, end-of-cycle operation rather than daily-use functionality, so it is valuable but lower frequency than browsing and period management.

**Independent Test**: Can be fully tested by triggering an export for a period, observing the job status change from in-progress to complete, downloading the file, and confirming the provisional/final numbering indicator matches the period's status.

**Acceptance Scenarios**:

1. **Given** a finance administrator viewing a period, **When** they trigger an export and select a format (OHADA/FEC or generic), **Then** an export job is created and its status is shown.
2. **Given** an export job is in progress, **When** the user remains on or returns to the page, **Then** the job status updates to reflect completion or failure without requiring a manual page reload.
3. **Given** a completed export job, **When** the user chooses to download, **Then** the resulting file is retrieved.
4. **Given** an export for an open period vs. a closed period, **When** the user views the export result, **Then** the UI clearly labels the numbering as provisional (open) or final (closed).

---

---

### Edge Cases

- What happens when a party search returns no matches, or matches multiple parties with similar names? System must show an empty/no-match state and, for multiple matches, a disambiguated selection list.
- How does the system handle an accounting period lifecycle action attempted while a conflicting action is already in progress (e.g., two administrators trying to lock the same period simultaneously)? Backend rejection reason must be surfaced rather than a generic error.
- What happens when a manual review item's proposed correcting entry does not actually balance or does not belong to the same party/period? The resolution must fail with the backend's validation message and the item must remain pending.
- How does the system handle an export job that fails (e.g., backend error mid-export)? Status must show "failed" with an actionable message, not appear stuck "in progress" indefinitely.
- What happens when a user's permissions change (e.g., loses finance-administrator rights) while they have a period-lifecycle or export action in progress? The next action attempt must be blocked by the current permission check, not by stale client-side state.
- How does the system handle attempting to open a new accounting period when an unclosed period already blocks it, per backend chronological rules? The rejection reason must be shown and the "open period" action guidance must reflect the required prior step.
- What happens when the deployment configuration is changed but the save fails partway (e.g., validation error on currency code)? The prior configuration must remain in effect and be clearly displayed as unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a paginated, filterable general ledger browser supporting filters for journal, accounting period, party, funder, and source event type, defaulting to the current open accounting period when no period filter is applied.
- **FR-001a**: Every filterable list in the module MUST have working filter controls (journal, accounting period, party, funder, source event type, and manual review queue filters) from initial delivery, using standard UI-kit filter components. Adopting the SVAR React Filter component (svar.dev/react/filter) for a consistent filter interaction across all screens is OPTIONAL for initial delivery and MAY be introduced later as an enhancement once the supporting GraphQL data-management layer it requires is built.
- **FR-002**: System MUST display each ledger entry's debit and credit lines together with visual confirmation that they balance.
- **FR-003**: System MUST show, for each ledger entry, a reference back to its originating openIMIS source event (claim, invoice, payroll, or payment point), distinguishing the source type.
- **FR-004**: System MUST allow a user to look up a party (Insuree/Family, Health Facility, or Payment Point Manager) via a single unified search spanning all party types, with results annotated by type, and view that party's running balance and per-period statement of ledger activity. The balance MUST be shown as a signed number (positive = owed by the party, negative = owed to the party) accompanied by a visible legend explaining the convention.
- **FR-005**: System MUST allow a user to look up a funder (programme/donor) and view aggregated activity/profitability figures for that funder, independent of party-level tagging.
- **FR-006**: System MUST list accounting periods with their current status (open, locked, closed).
- **FR-007**: System MUST allow a finance administrator to open a new accounting period.
- **FR-008**: System MUST allow a finance administrator to lock, close, or reopen an accounting period, enabling only the actions valid for that period's current status and the backend's chronological-order rules.
- **FR-009**: System MUST surface the backend's specific rejection reason when a period lifecycle action is denied, rather than a generic failure message.
- **FR-010**: System MUST list manual review queue items showing their pending/resolved status and rejection/flag reason.
- **FR-011**: System MUST allow a finance administrator to resolve a manual review item by selecting an already-posted correcting entry — restricted to entries belonging to the same party and accounting period as the flagged item — and entering a resolution note.
- **FR-012**: System MUST prevent any editing of the original flagged ledger entry from the manual review workflow or any other screen.
- **FR-013**: System MUST allow a finance administrator to trigger a period export in OHADA/FEC or generic CSV format.
- **FR-014**: System MUST show export job status (e.g., in progress, complete, failed) and update it without requiring a manual page reload.
- **FR-015**: System MUST allow the user to download the resulting export file once the job completes.
- **FR-016**: System MUST indicate whether export numbering is provisional (period open) or final (period closed).
- **FR-017**: System MUST provide a deployment configuration screen where a finance administrator can set operating mode (local-only vs. replicated), external system (when replicated, selected from the list of external systems exposed by the backend — currently Odoo/Sage, but not hardcoded so it accommodates future additions), currency code (selected from a dropdown of valid currency codes exposed by the backend, not free text), and retained earnings account (selected from a dropdown/lookup of existing chart-of-accounts entries validated against the backend, not free text).
- **FR-018**: System MUST require explicit confirmation and display a clear forward-only warning before applying an operating-mode change, communicating that switching modes does not retroactively replicate past entries.
- **FR-019**: System MUST grant read access to general ledger browsing, party sub-ledger, and funder activity views to any user holding the general ledger reporting permission, without additional row-level restriction by party or funder.
- **FR-020**: System MUST restrict accounting period lifecycle actions, manual review resolution, and deployment configuration (both viewing and modifying) to users holding finance-administrator-level permission, following openIMIS's existing RBAC/menu-permission conventions.
- **FR-021**: System MUST register its screens in the openIMIS menu system, showing/hiding entries based on the viewing user's permissions.
- **FR-022**: System MUST NOT provide UI for multi-currency entry/display, multi-entity consolidation, or budget line-item management beyond the funder dimension.
- **FR-023**: The general ledger browser MUST present entries as an expandable/collapsible tree (group rows expanding to their underlying debit/credit lines) from initial delivery, with each group row showing computed debit, credit, and balance subtotals, using any grid capable of expand/collapse grouping. Implementing this tree-row grid specifically with the SVAR DataGrid framework is OPTIONAL for initial delivery and MAY be introduced later once the supporting GraphQL data-management layer it requires is built.

### Key Entities

- **Ledger Entry**: A posted journal record for an accounting period, composed of balanced debit/credit lines, tagged to a party and/or funder, and referencing a source event (claim, invoice, payroll, payment point transaction).
- **Accounting Period**: A time-bounded accounting window with a lifecycle status (open, locked, closed) governing which postings and exports are permitted.
- **Party**: An entity (Insuree/Family, Health Facility, or Payment Point Manager) that a ledger entry may be tagged to, with a running balance per accounting period.
- **Funder**: A programme or donor that a ledger entry may be tagged to, independent of party tagging, used for aggregated activity/profitability reporting.
- **Manual Review Item**: A flagged exception (replication rejection or unconfirmed posting) referencing an original ledger entry, its rejection reason, its resolution status, and — once resolved — the linking correcting entry and resolution note.
- **Export Job**: An asynchronous request to generate a period's export file in a given format, with a status (in progress, complete, failed) and, when complete, a downloadable file and provisional/final numbering indicator.
- **Deployment Configuration**: The module-wide settings controlling operating mode (local-only/replicated), external system, currency code, and retained earnings account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Finance staff can locate a specific ledger entry and trace it to its source event in under 2 minutes using filters, without needing to consult another system.
- **SC-002**: A party's current balance and per-period statement can be retrieved in under 3 clicks from the module's landing screen.
- **SC-003**: 100% of accounting period lifecycle action rejections display the backend's specific reason text to the user, with zero generic/unexplained failures.
- **SC-004**: Finance administrators can resolve a manual review item (link + note) without ever being able to modify the original flagged entry, verified across all resolution attempts.
- **SC-005**: Users can trigger a period export and download the completed file without manually refreshing the page to check status.
- **SC-006**: 100% of screens and actions restricted to finance-administrators are inaccessible (hidden or blocked) to users lacking that permission, verified across every listed screen.
- **SC-007**: Administrators changing the deployment operating mode see and must acknowledge the forward-only warning before the change takes effect, with zero silent mode switches.

## Assumptions

- The backend GraphQL API (openimis-be-ledger_py) already exposes the listed queries and mutations with server-side validation, permission enforcement, and rejection-reason messages; the frontend consumes and surfaces these rather than re-implementing business rules.
- "Finance-administrator-level permission" maps to a specific openIMIS role/right to be defined during technical planning, distinct from the general ledger reporting permission; both follow existing openIMIS RBAC conventions already used by other openimis-fe-* modules.
- Party search (Insuree/Family, Health Facility, Payment Point Manager) reuses identity/lookup data already available elsewhere in openIMIS rather than this module owning party master data.
- Funder (programme/donor) reference data is provided by the backend/another module; this module only consumes it for filtering and reporting.
- Export job status is retrievable via polling or a comparable mechanism exposed by the backend (exportSequences / exportAccountingPeriod); no specific transport mechanism is mandated by this spec.
- Standard openIMIS session-based authentication is reused; no new authentication mechanism is introduced.
- CSV is the only export file format required at this time (OHADA/FEC and generic variants), consistent with the feature description.
- The SVAR DataGrid (tree rows) and SVAR React Filter adoptions are deferred, optional enhancements: initial delivery uses functionally equivalent baseline components (expandable list/grid, standard filters), and migrating to the SVAR components is scoped as follow-up work once the GraphQL data-binding layer they require is in place.
