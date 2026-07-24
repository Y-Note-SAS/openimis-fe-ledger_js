// Ledger main-menu contribution (FR-020/FR-021). Unlike this module's first
// draft (written before the real spec was found), the actual spec makes no
// mention of joining Invoice's "Legal & Finance" menu — Ledger gets its own
// top-level menu group, consistent with how openimis-fe-claim_js registers
// "ClaimMainMenu" / "claim.MainMenu" rather than attaching to another
// module's menu.
export const LEDGER_MAIN_MENU_ID = "ledger.MainMenu";

export const coreMainMenuEntry = {
  name: "LedgerMainMenu",
  id: LEDGER_MAIN_MENU_ID,
  text: "ledger.mainMenu",
  icon: "AccountBalance",
};

// Rights-based visibility of each entry is handled automatically by
// fe-core's MainMenuBar (it cross-references each entry's `route` against
// the matching core.Router entry's `rights`), so entries here only need
// `text`/`route`/`icon` — no manual permission filtering (openimis-fe-core_js
// src/components/MainMenuBar.jsx#prepareMenuEntries).
export const buildLedgerMainMenuEntries = (routes) => [
  {
    text: "ledger.menu.generalLedger",
    route: routes.ROUTE_GENERAL_LEDGER,
  },
  {
    text: "ledger.menu.partyLedger",
    route: routes.ROUTE_PARTY_LEDGER,
  },
  {
    text: "ledger.menu.funderActivity",
    route: routes.ROUTE_FUNDER_ACTIVITY,
  },
  {
    text: "ledger.menu.accountingPeriods",
    route: routes.ROUTE_ACCOUNTING_PERIODS,
  },
  {
    text: "ledger.menu.manualReviewQueue",
    route: routes.ROUTE_MANUAL_REVIEW_QUEUE,
  },
  {
    text: "ledger.menu.periodExport",
    route: routes.ROUTE_PERIOD_EXPORT,
  },
  {
    text: "ledger.menu.deploymentConfiguration",
    route: routes.ROUTE_DEPLOYMENT_CONFIGURATION,
  },
];
