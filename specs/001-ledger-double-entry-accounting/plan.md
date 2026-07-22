# Implementation Plan: Ledger & Double-Entry Accounting Frontend

**Branch**: `001-ledger-double-entry-accounting` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ledger-double-entry-accounting/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build `@openimis/fe-ledger`, a new openIMIS frontend module that gives finance staff and finance administrators a UI over the `openimis-be-ledger_py` GraphQL surface: a general ledger browser, party sub-ledger and funder activity reports, accounting-period lifecycle management, a manual review queue, period export, and (admin-only) deployment configuration. The module follows the established `openimis-fe-*` module contract used by `openimis-fe-claim_js` and `openimis-fe-core_js` — a `ModuleName(cfg)` factory exporting reducers, menu contributions, routes, and pickers — using `redux-api-middleware`-backed GraphQL calls (`graphql`/`graphqlWithVariables`/`formatMutation` from `@openimis/fe-core`) rather than `@apollo/client` or `redux-saga`, since no sibling `openimis-fe-*` module in this codebase uses either; MUI v7 components via `@openimis/fe-core`'s `Searcher`/`Form`/`Contribution` primitives provide the baseline UI, with the SVAR DataGrid tree-rows and SVAR React Filter mandated by the spec wired in as an explicitly optional, deferred enhancement (FR-001a, FR-023) once a dedicated GraphQL data-binding layer for them exists.

## Technical Context

**Language/Version**: JavaScript (ES2020+ JSX), React 18.2 — matches `openimis-fe-claim_js`/`openimis-fe-core_js`; no TypeScript is used elsewhere in this codebase.

**Primary Dependencies**: `@openimis/fe-core` (file: `../openimis-fe-core_js`, provides `graphql`/`graphqlWithVariables`/`formatMutation`/`formatQuery`/`formatPageQuery(WithCount)`/`decodeId`/`Searcher`/`Form`/`MainMenuContribution`/`withModulesManager`/RBAC helpers), `redux`, `redux-api-middleware`, `react-redux`, `react-intl`, `react-router-dom` 5.x, `@mui/material` 7.x + `@mui/icons-material` 7.x, `lodash`. `svar-datagrid`/`svar-filter` (`@svar/react-filter` and SVAR DataGrid packages, see svar.dev/react) added as optional peer dependencies for the deferred enhancement path (FR-001a, FR-023) — not required for the baseline build.

**Storage**: N/A (frontend module; all persistence is via the `openimis-be-ledger_py` GraphQL API). Client-side Redux store only, scoped under the `ledger` reducer key.

**Testing**: Jest + React Testing Library, consistent with `@openimis/fe-core`'s toolchain (`vite build` for bundling; no existing sibling module ships a test suite to mirror exactly, so this module introduces baseline unit tests per the project's global unit-testing policy — reducers, action creators, and permission-gating logic are the primary units under test).

**Target Platform**: Browser (openIMIS Enterprise Front End SPA), served as an npm-installable submodule (`@openimis/fe-ledger`) consumed by `openimis-fe_js`'s module registry, same as `@openimis/fe-claim`.

**Project Type**: Single frontend library/module (no backend code in this repo — the GraphQL backend is `openimis-be-ledger_py`, a separate repo/consumer relationship).

**Performance Goals**: Ledger browser initial page render (default-period, first page) in line with SC-001 (locate + trace an entry in under 2 minutes including think time); party balance screen backend-bound at "under 3 clicks" (SC-002) — backend serves `partyLedgerBalance` from a pre-aggregated table per the backend's own design, so the frontend's job is to avoid adding round-trips (single combined query per view, no client-side re-aggregation of raw legs).

**Constraints**: Must not implement business rules (balance validation, period chronology, permission checks) client-side beyond disabling/hiding controls for UX — all authoritative validation and rejection reasoning comes from the backend (spec Assumptions) and MUST be surfaced verbatim (FR-009, SC-003). Must never expose an edit affordance for a posted ledger entry (FR-012, SC-004) — this is enforced by omitting edit UI entirely, not by disabling a button.

**Scale/Scope**: 7 top-level screens (general ledger browser, party sub-ledger, funder report, accounting periods, manual review queue, period export, deployment configuration) plus shared pickers (party picker, funder picker, journal picker, accounting-period picker) and 2 permission tiers (general ledger reporting; finance-administrator).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` in this repository is still the unfilled template (all principle placeholders are unresolved `[PRINCIPLE_N_NAME]` markers) — there are no ratified project-specific principles to gate against. Falling back to the repository-wide `CLAUDE.md` development guidelines, which are binding regardless of constitution status:

- **Unit Testing Policy** ("all new functions must be unit tested"): honored — Phase 2 tasks (`/speckit-tasks`) MUST include unit tests for every new reducer case, action creator, permission-check helper, and non-trivial UI logic function (e.g., sign-convention formatting, tree-row subtotal computation, filter-state serialization).
- **API Documentation Policy**: not applicable to this repo — this module is a GraphQL *consumer*, not an API provider; no `openapi.yaml` is produced here. (The DCI-specific clause in `CLAUDE.md` is irrelevant to this feature.)

No gate violations. Nothing to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-ledger-double-entry-accounting/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── graphql-operations.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.jsx                          # LedgerModule(cfg) factory: reducers, menu, routes, refs (pickers), translations
├── constants.js                       # MODULE_NAME, RIGHT_* constants, source-event-type / status enums mirrored from backend
├── reducer.js                         # Single `ledger` reducer keyed by feature area (entries, periods, review, export, deployment, party/funder lookups)
├── actions.js                         # graphql()/graphqlWithVariables()/formatMutation() action creators for every query/mutation in contracts/graphql-operations.md
├── utils/
│   └── balance.js                     # Signed-balance formatting/legend helper (party sub-ledger, FR-004)
├── menus/
│   └── LedgerMainMenu.jsx             # Main-menu contribution, permission-filtered per FR-020/FR-021
├── pickers/
│   ├── PartyPicker.jsx                # Unified party search across all three party types (FR-004)
│   ├── FunderPicker.jsx               # Funder lookup (FR-005)
│   ├── LedgerJournalPicker.jsx
│   └── AccountingPeriodPicker.jsx
├── components/
│   ├── LedgerEntryGrid.jsx            # Baseline expandable/collapsible grid (FR-023 baseline path)
│   ├── LedgerEntryGridSvar.jsx        # SVAR DataGrid tree-row implementation (FR-023 deferred path), same data contract as above
│   ├── LedgerFilters.jsx              # Baseline filter controls (FR-001a baseline path)
│   ├── LedgerFiltersSvar.jsx          # SVAR React Filter implementation (FR-001a deferred path)
│   ├── AccountingPeriodStatusBadge.jsx
│   ├── ManualReviewResolutionDialog.jsx
│   ├── ExportJobStatus.jsx
│   └── ForwardOnlyModeWarningDialog.jsx
├── pages/
│   ├── GeneralLedgerPage.jsx          # User Story 1
│   ├── PartyLedgerPage.jsx            # User Story 2
│   ├── FunderActivityPage.jsx         # User Story 3
│   ├── AccountingPeriodsPage.jsx      # User Story 4
│   ├── ManualReviewQueuePage.jsx      # User Story 5
│   ├── PeriodExportPage.jsx           # User Story 6
│   └── DeploymentConfigurationPage.jsx # User Story 7
└── translations/
    └── en.json

tests/
├── reducer.test.js
├── actions.test.js
├── utils/balance.test.js
└── components/                        # permission-gating and formatting unit tests per CLAUDE.md testing policy
```

**Structure Decision**: Single-package frontend module (matches the flat `src/` layout of `openimis-fe-claim_js` and `openimis-fe-core_js`; no `backend/`/`frontend/` split since this repository *is* the frontend half of an already-separate backend repo). `tests/` is new relative to sibling modules (which ship no test suite) — added specifically to satisfy the repository's `CLAUDE.md` unit-testing policy, which is binding independent of the unfilled constitution.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
