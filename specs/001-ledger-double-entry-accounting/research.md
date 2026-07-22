# Phase 0 Research: Ledger & Double-Entry Accounting Frontend

## 1. Data-layer pattern: `@apollo/client`+sagas (as literally named in the feature description) vs. this codebase's actual convention

**Decision**: Use `@openimis/fe-core`'s `graphql()` / `graphqlWithVariables()` / `formatMutation()` action creators dispatched through `redux-api-middleware`, with plain Redux `reducer.js` + `actions.js` files (Flux Standard Action `_REQ`/`_RESP`/`_ERR` triplets) — the same pattern used by `openimis-fe-claim_js` and `openimis-fe-core_js`.

**Rationale**: The feature description's parenthetical ("GraphQL via @apollo/client", "sagas") describes generic `openimis-fe-*` conventions, but the actual sibling modules present in this development environment (`openimis-fe-claim_js`, `openimis-fe-core_js`) use neither `@apollo/client` nor `redux-saga` anywhere — `grep` across every `package.json` and `src/` tree in `/private/var/www/openimisDevelop/openimis-fe-*` found zero matches for `@apollo/client`, `apollo`, or `redux-saga`. They instead route every GraphQL call through `redux-api-middleware` via helpers exported from `@openimis/fe-core` (`graphql`, `graphqlWithVariables`, `formatMutation`, `formatQuery`, `formatPageQuery`/`formatPageQueryWithCount`). The spec's own primary instruction is to follow "openIMIS's openimis-fe-* React module conventions" — since that is the governing intent and the literal tech names are demonstrably not what those conventions are in this codebase, the actual convention wins. Introducing Apollo Client and redux-saga alongside `redux-api-middleware` would mean two competing data-fetching stacks and two competing side-effect models in one module, which is unnecessary complexity contradicting the "follow existing conventions" instruction.

**Alternatives considered**:
- *Apollo Client + Apollo hooks*: rejected — would require standing up a second GraphQL client and cache alongside the app-wide `redux-api-middleware` store already used by every other module the host app loads (`openimis-fe_js`'s module registry composes reducers/middleware from all registered modules into one store); duplicate network/caching layers, and no precedent in this codebase.
- *redux-saga*: rejected — no existing `openimis-fe-*` module in this environment uses sagas; introducing it here would be a one-off pattern this module alone would have to maintain.

## 2. GraphQL operations to implement

**Decision**: Mirror the operations documented in `openimis-be-ledger_py`'s own `specs/001-ledger-double-entry-accounting/contracts/graphql-api.md` (the backend module's design contract — the backend itself is unimplemented/stub code, so this is the authoritative source of query/mutation names, arguments, and field shapes until the backend ships). See `contracts/graphql-operations.md` in this feature directory for the concrete query/mutation strings this frontend will send.

**Rationale**: The backend repo's Python schema files (`schema.py`, `gql_queries.py`, `gql_mutations.py`) are empty stubs — there is no live GraphQL schema to introspect. The backend's own spec-kit `data-model.md` and `contracts/graphql-api.md`, however, are complete and consistent with this frontend's spec (same query/mutation names, same entities). Building against that design doc is the only way to make forward progress; it is flagged as a **cross-repo dependency risk** below.

**Alternatives considered**:
- *Wait for backend implementation before writing any frontend code*: rejected — blocks all frontend work indefinitely; the backend's design doc is detailed enough (exact field lists, enums, validation rules) to build against with contract tests that will catch drift once the real schema lands.
- *Introspect a running backend instance*: not available in this environment (no live GraphQL endpoint for `openimis-be-ledger_py`).

**Risk flagged for follow-up**: `openimis-be-ledger_py`'s `ledger/schema.py`, `ledger/gql_mutations.py`, and `ledger/gql_queries.py` are empty; `ledger/models.py` only contains legacy `Sequence`/`AccountPeriod`/`AccountJournal` models unrelated to the new design. This frontend module cannot be integration-tested end-to-end until the backend implements its own `tasks.md`. Recommend treating backend delivery as a hard blocking dependency for this module's integration/E2E test phase (contract/unit tests can proceed independently against mocked responses shaped per `contracts/graphql-operations.md`).

## 3. Permission / RIGHT constants

**Decision**: Define two new right-range constants in this module's `constants.js` — `RIGHT_LEDGER_REPORTING` (read access: general ledger browser, party sub-ledger, funder report) and `RIGHT_LEDGER_ADMIN` (period lifecycle, manual review resolution, deployment configuration) — using a currently-unused numeric range, flagged as **provisional pending confirmation against the backend's actual right constants once `openimis-be-ledger_py/ledger/apps.py DEFAULT_CFG` is implemented**.

**Rationale**: `openIMIS` modules declare a small integer "right" per permission and gate both menu visibility and mutation calls on the logged-in user's right list (see `openimis-fe-claim_js/src/constants.js`'s `RIGHT_ADD`/`RIGHT_SUBMIT`/etc. pattern, checked in `ClaimMainMenu.jsx` via `rights.some(...)`). The backend repo currently defines *no* `RIGHT_` constants anywhere (confirmed via repo-wide search) — `ledger/apps.py`'s `DEFAULT_CFG` is empty. This frontend must still declare its expected rights now so screens can be permission-gated per FR-019/FR-020, but the concrete integer values are a placeholder until the backend module assigns and publishes its real right constants.

**Alternatives considered**:
- *Hardcode against a guessed backend right ID immediately*: rejected — right IDs must be coordinated across the backend module's `DEFAULT_CFG` and the openIMIS-wide role/right admin UI; picking a colliding number silently breaks another module's permission. Provisional constants isolated in one file, called out in this research doc, are safer and cheaply swapped later.

## 4. Baseline vs. SVAR-enhanced UI (FR-001a, FR-023)

**Decision**: Implement two parallel, swappable component pairs — `LedgerFilters`/`LedgerFiltersSvar` and `LedgerEntryGrid`/`LedgerEntryGridSvar` — sharing the same props contract (filter state shape; row/grouping data shape). The baseline pair ships first and is wired into `GeneralLedgerPage`; the SVAR pair is built against the same contract as a drop-in replacement, activated via a module config flag (`modulesManager.getConf("fe-ledger", "useSvarComponents", false)`), consistent with how other `openimis-fe-*` modules expose per-deployment config toggles (see `openimis-fe-claim_js`'s `props.modulesManager.getConf("fe-claim", ...)` usage in `HealthFacilitiesPage.jsx`).

**Rationale**: The spec's Clarifications explicitly make SVAR adoption optional for initial delivery pending a "dedicated GraphQL data-management layer." A shared props contract means the SVAR migration (when undertaken) is a component swap, not a data-layer rewrite — the `actions.js`/`reducer.js` GraphQL layer is identical either way.

**Alternatives considered**:
- *Build only the baseline and treat SVAR as a completely separate future feature with no contract*: rejected — risks the eventual SVAR components needing an incompatible data shape, forcing rework of `reducer.js`/`actions.js` a second time.
- *Build SVAR components first (per the letter of the original request) and defer baseline*: rejected — contradicts the explicit clarification that baseline ships first because SVAR needs infrastructure ("GraphQL data-management layer") not yet built.

## 5. Export job status delivery (polling vs. push)

**Decision**: Poll `exportSequences`/an export-job-status query at a fixed interval (e.g., every 3s) while an export job is `in_progress`, using a `setInterval`-driven repeated dispatch cleared on unmount or terminal status, mirroring the "no manual reload" requirement (FR-014) without introducing a new transport (WebSocket/SSE) absent from every other `openimis-fe-*` module in this environment.

**Rationale**: Spec Assumptions explicitly leave the transport mechanism unspecified ("no specific transport mechanism is mandated by this spec"); the backend's own contract doc describes an async Celery task returning a pollable job/export reference, not a push channel. Polling is the lowest-complexity option consistent with existing conventions (no sibling module in this codebase uses WebSockets/SSE).

**Alternatives considered**:
- *WebSocket/GraphQL subscription*: rejected for v1 — no existing `openimis-fe-*` module or `openimis-be-ledger_py` contract establishes a subscription transport; would be new infrastructure for both repos.

## 6. Party/funder reference data source

**Decision**: Party and funder lookups call the ledger backend's own `AnalyticValue`-backed search (implied by `partyLedgerBalance(analyticValueId, ...)`/`funderActivityReport(analyticValueId, ...)` taking an `analyticValueId`) rather than querying Insuree/HealthFacility/PaymentPoint modules directly — the ledger backend's `AnalyticValue.external_reference` already points at the underlying domain record, so this module treats `AnalyticValue` as its party/funder search index and defers to other modules' pickers only for *display* enrichment if needed later, not for the initial lookup.

**Rationale**: Matches spec Assumptions ("Party search reuses identity/lookup data already available elsewhere... rather than this module owning party master data") while staying consistent with the backend's actual data model (`AnalyticValue`), avoiding a fan-out query across three unrelated modules (Insuree, HealthFacility, PaymentPoint) just to power one search box.

**Alternatives considered**:
- *Query Insuree/HealthFacility/PaymentPoint modules' own search endpoints and merge client-side*: rejected — three separate queries merged client-side is slower and more complex than one `AnalyticValue`-scoped search the ledger backend already needs to resolve `analyticValueId` filters.
