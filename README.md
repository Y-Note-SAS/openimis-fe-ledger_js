# @openimis/fe-ledger

openIMIS frontend module for `openimis-be-ledger_py`'s double-entry
accounting/ledger domain, built against the official specs shipped in this
repository under `specs/001-ledger-double-entry-accounting/` (`spec.md`,
`plan.md`, `research.md`, `data-model.md`, `contracts/graphql-operations.md`,
`tasks.md`).

## Status: all 7 user stories implemented (spec.md US1–US7)

- **US1 — Browse the General Ledger**: `GeneralLedgerPage`, Relay-paginated
  `fetchLedgerEntries` with FR-001 default-open-period behavior, baseline
  expandable/collapsible `LedgerEntryGrid` with debit/credit/balance
  subtotals, `LedgerFilters`.
- **US2 — Party Sub-Ledger**: `PartyLedgerPage`, `PartyPicker` (unified
  AnalyticValue search), signed balance (`utils/balance.js`), period
  statement.
- **US3 — Funder Activity**: `FunderActivityPage`, `FunderPicker`, category
  breakdown, independent of any party filter.
- **US4 — Accounting Periods**: `AccountingPeriodsPage`, open/lock/close/
  reopen lifecycle, `utils/periodActions.js` (chronological-order gating),
  rejection reasons surfaced verbatim (FR-009).
- **US5 — Manual Review Queue**: `ManualReviewQueuePage` (admin-only, even
  read), `ManualReviewResolutionDialog` (original entry read-only, FR-012),
  `utils/correctingEntryCandidates.js`.
- **US6 — Period Export**: `PeriodExportPage`, async export job +
  `pollExportJob` polling loop, `ExportJobStatus` (provisional/final badge,
  download link, failure message).
- **US7 — Deployment Configuration**: `DeploymentConfigurationPage`
  (admin-only), `ForwardOnlyModeWarningDialog` (mandatory acknowledgement
  before an operating-mode change, FR-018).

All routes, the dedicated "Ledger" main menu, and every picker are wired in
`src/index.jsx`.

**Deliberately not built** (per the spec's own Clarifications — explicitly
deferred): the SVAR DataGrid/SVAR Filter enhancement pair. The baseline
expandable-table `LedgerEntryGrid` and plain `LedgerFilters` fully satisfy
the spec's baseline requirements on their own.

## Verified, not just written

Unlike a purely-generated skeleton, this module has actually been **installed,
tested, and built** in a sandbox:

- `npm test` → **55/55 tests passing** across 14 suites (reducer, actions,
  utils, components, and a full-page smoke-test suite rendering all 7 pages
  against a real Redux store).
- `npx vite build` → **builds cleanly** to `dist/index.es.js` / `dist/index.cjs.js`.

Doing this surfaced and fixed **7 real bugs** that a syntax-only check would
have missed:
1. `.babelrc` (copied from `fe-invoice`) set `modules: false` for Vite,
   which silently broke Jest's ability to parse any file — fixed with a
   babel `env.test` override.
2. A `file:../openimis-fe-core_js` dependency (a leftover from my own local
   testing) broke `npm install` entirely — replaced with a proper
   `peerDependency`.
3. `fetchFunderActivityReport` was accidentally deleted by an earlier
   find-and-replace edit and only caught by the real Vite build, not by any
   test — restored.
4. `DEFUALT_DEBOUNCE_TIME` was referenced by `PartyPicker`/`FunderPicker` but
   never (re-)exported from `constants.js` after a rewrite — restored.
5–7. Missing `react-redux`/`lodash`/`redux-thunk` devDependencies, a test
   assertion that was flaky against MUI `Collapse`'s async unmount, and a
   test that queried a MUI `Select`'s `MenuItem` before opening the dropdown.

## Why this replaced the first draft

An earlier draft of this module (before `openimis-fe-ledger_js`'s real specs
were found on GitHub) was built purely from a hand-written plan, using
`openimis-fe-invoice_js` conventions (offset pagination, string-interpolated
GraphQL, 6 granular rights, entries joining Invoice's "Legal & Finance" menu).
Once the actual spec-kit specs were located and read in full, they diverged
on nearly every substantive point — see the table below.

## Key divergences from the first draft (now corrected)

| Aspect | First draft (wrong) | Actual spec (implemented) |
|---|---|---|
| Query root fields | `ledgerEntry`, `ledgerEntryLine`, `partyLedgerReport`, `ledgerReplicationReviewItem` | `ledgerEntries` (Relay-paginated, embeds lines as `legs`), `partyLedgerBalance`, `manualReviewQueue`, `exportSequences` |
| Pagination | offset (`formatPageQueryWithCount`) | Relay cursor (`edges`/`node`/`pageInfo`/`totalCount`) |
| GraphQL call style | string-interpolated (`formatMutation`) | typed variables (`graphqlWithVariables`), per research.md §1 |
| Rights | 6 granular constants invented | 2: `RIGHT_LEDGER_REPORTING`, `RIGHT_LEDGER_ADMIN` (still provisional — backend has no `RIGHT_` constants yet) |
| Manual review resolution | arbitrary status field | link to an already-posted correcting entry (same party+period) + note |
| Period export | mutation returns a direct download URL | async job (`exportJob`), polled via `exportSequences` until `complete`/`failed` |
| Main menu | joins Invoice's "Legal & Finance" menu | own top-level "Ledger" menu |
| Missing entirely | — | Deployment Configuration screen (US7), tree-row grid requirement (FR-023), unified party/funder search via `AnalyticValue` |

Full detail in `specs/001-ledger-double-entry-accounting/contracts/graphql-operations.md`
and `research.md`.

## Known caveats carried over from the spec itself

- **Backend is a stub.** `openimis-be-ledger_py`'s schema files are empty;
  everything here is built against the backend's own design-contract docs.
  Expect drift once the backend actually ships — this module cannot be
  integration-tested until then.
- **Right IDs are provisional** (research.md §3) — coordinate with the
  backend team before shipping, to avoid colliding with another module's
  right ID.
- **Journal filter is free text**, not a picker — no `journals` reference
  query exists in the contract (only a `journal: String` argument).
- **The `analyticValues(search, tagType)` search query behind
  `PartyPicker`/`FunderPicker` is an assumption**, not a literal contract —
  research.md §6 establishes the AnalyticValue-backed search exists but
  doesn't name the query. Adjust once the backend names it.
- **`utils/correctingEntryCandidates.js`'s party/period matching logic is an
  interpretation**: `LedgerEntryViewModel` has no flat party/period fields,
  so "the entry's party" is read as "any of its lines is tagged with that
  party."
- **`utils/periodActions.js`'s lock/close/reopen ordering rule is an
  interpretation** of "chronological-order enforcement" (oldest-first for
  lock/close, newest-first for reopen) — a client-side hint only; the
  backend mutation response is always authoritative.

## ⚠️ Ecosystem-version caveat (discovered during this build)

The `openimis-fe-invoice_js`/`openimis-fe-core_js` GitHub repos (cloned from
their default branch to derive conventions) are on **React 18 + Vite + MUI
v7 + react-intl v7** — but the versions currently published to the public
npm registry (`@openimis/fe-core@1.11.0`, `latest` tag) are still on
**React 17 + Rollup + react-intl v5**, with no newer dist-tag available.
This module is built to match the GitHub repos' (and this spec's own
`research.md`/`plan.md` Technical Context's) newer generation, since that's
what the Ledger spec itself was evidently written against. Practically, this
means:
- `npm install` against the public registry today will resolve an
  incompatible (older) `@openimis/fe-core`; expect to need workspace-linking
  against sibling repos on the same branch generation until that migration
  is actually published, or to pin against whatever your organization's
  private registry/fork currently serves.
- `package.json`'s `@openimis/fe-core` peer is deliberately left as `"*"`
  rather than a specific range, to avoid falsely implying npm-registry
  compatibility either way.

## Build / test

```bash
npm install
npm run build   # vite build — verified clean in this sandbox
npm test        # jest — verified 55/55 passing in this sandbox
```
