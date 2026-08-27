import { describe, it, expect } from "vitest";
import { LEDGER_SUBMENU_ID, buildLedgerSubMenuEntry } from "../../src/menus/LedgerMainMenu";

const ROUTES = {
  ROUTE_GENERAL_LEDGER: "/general-ledger",
  ROUTE_PARTY_LEDGER: "/party-ledger",
  ROUTE_FUNDER_ACTIVITY: "/funder-activity",
  ROUTE_ACCOUNTING_PERIODS: "/accounting-periods",
  ROUTE_MANUAL_REVIEW_QUEUE: "/manual-review-queue",
  ROUTE_PERIOD_EXPORT: "/period-export",
  ROUTE_DEPLOYMENT_CONFIGURATION: "/deployment-configuration",
};

describe("LedgerMainMenu", () => {
  it("exports LEDGER_SUBMENU_ID constant", () => {
    expect(LEDGER_SUBMENU_ID).toBe("ledger.MainMenu");
  });

  it("buildLedgerSubMenuEntry returns a two-level submenu entry with the seven ledger pages as children", () => {
    const entry = buildLedgerSubMenuEntry(ROUTES);

    expect(entry).toEqual({
      id: "ledger.MainMenu",
      text: "ledger.mainMenu",
      icon: "AccountBalance",
      children: [
        { text: "ledger.menu.generalLedger", route: "/general-ledger" },
        { text: "ledger.menu.partyLedger", route: "/party-ledger" },
        { text: "ledger.menu.funderActivity", route: "/funder-activity" },
        { text: "ledger.menu.accountingPeriods", route: "/accounting-periods" },
        { text: "ledger.menu.manualReviewQueue", route: "/manual-review-queue" },
        { text: "ledger.menu.periodExport", route: "/period-export" },
        { text: "ledger.menu.deploymentConfiguration", route: "/deployment-configuration" },
      ],
    });
  });

  it("buildLedgerSubMenuEntry uses route values from the routes object", () => {
    const customRoutes = {
      ROUTE_GENERAL_LEDGER: "/custom-general-ledger",
      ROUTE_PARTY_LEDGER: "/custom-party-ledger",
      ROUTE_FUNDER_ACTIVITY: "/custom-funder-activity",
      ROUTE_ACCOUNTING_PERIODS: "/custom-accounting-periods",
      ROUTE_MANUAL_REVIEW_QUEUE: "/custom-manual-review-queue",
      ROUTE_PERIOD_EXPORT: "/custom-period-export",
      ROUTE_DEPLOYMENT_CONFIGURATION: "/custom-deployment-configuration",
    };

    const entry = buildLedgerSubMenuEntry(customRoutes);

    expect(entry.children[0].route).toBe("/custom-general-ledger");
    expect(entry.children[1].route).toBe("/custom-party-ledger");
    expect(entry.children[2].route).toBe("/custom-funder-activity");
    expect(entry.children[3].route).toBe("/custom-accounting-periods");
    expect(entry.children[4].route).toBe("/custom-manual-review-queue");
    expect(entry.children[5].route).toBe("/custom-period-export");
    expect(entry.children[6].route).toBe("/custom-deployment-configuration");
  });

  it("each child has text and route properties", () => {
    const entry = buildLedgerSubMenuEntry(ROUTES);

    expect(entry.children).toHaveLength(7);
    entry.children.forEach((child) => {
      expect(typeof child.text).toBe("string");
      expect(typeof child.route).toBe("string");
    });
  });

  it("submenu entry has all required group properties", () => {
    const entry = buildLedgerSubMenuEntry(ROUTES);

    expect(entry).toHaveProperty("id");
    expect(entry).toHaveProperty("text");
    expect(entry).toHaveProperty("icon");
    expect(Array.isArray(entry.children)).toBe(true);
    expect(typeof entry.id).toBe("string");
    expect(typeof entry.text).toBe("string");
    expect(typeof entry.icon).toBe("string");
  });
});
