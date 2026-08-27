// Ledger menu contribution (ticket 37896). Ledger is no longer a top-level
// menu: it is contributed as a two-level submenu of the "Legal and Finance"
// main menu (invoice.MainMenu), grouping the ledger pages as its children.
// fe-core's MainMenuContribution renders entries carrying `children` as a
// collapsible submenu (nested level) under the hosting main menu.
export const LEDGER_SUBMENU_ID = "ledger.MainMenu";

// Rights-based visibility of each child is handled automatically by
// fe-core's MainMenuBar (it cross-references each child's `route` against
// the matching core.Router entry's `rights`), so children only need
// `text`/`route` — no manual permission filtering.
export const buildLedgerSubMenuEntry = (routes) => ({
  id: LEDGER_SUBMENU_ID,
  text: "ledger.mainMenu",
  icon: "AccountBalance",
  children: [
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
  ],
});
