import { describe, it, expect } from "vitest";
import { LEDGER_MAIN_MENU_ID, coreMainMenuEntry, buildLedgerMainMenuEntries } from "../../src/menus/LedgerMainMenu";

describe("LedgerMainMenu", () => {
  it("exports LEDGER_MAIN_MENU_ID constant", () => {
    expect(LEDGER_MAIN_MENU_ID).toBe("ledger.MainMenu");
  });

  it("exports coreMainMenuEntry with correct structure", () => {
    expect(coreMainMenuEntry).toEqual({
      name: "LedgerMainMenu",
      id: "ledger.MainMenu",
      text: "ledger.mainMenu",
      icon: "AccountBalance",
    });
  });

  it("buildLedgerMainMenuEntries returns array of menu entries", () => {
    const routes = {
      ROUTE_GENERAL_LEDGER: "/general-ledger",
      ROUTE_PARTY_LEDGER: "/party-ledger",
      ROUTE_FUNDER_ACTIVITY: "/funder-activity",
      ROUTE_ACCOUNTING_PERIODS: "/accounting-periods",
      ROUTE_MANUAL_REVIEW_QUEUE: "/manual-review-queue",
      ROUTE_PERIOD_EXPORT: "/period-export",
      ROUTE_DEPLOYMENT_CONFIGURATION: "/deployment-configuration",
    };

    const entries = buildLedgerMainMenuEntries(routes);
    
    expect(entries).toHaveLength(7);
    expect(entries).toEqual([
      {
        text: "ledger.menu.generalLedger",
        route: "/general-ledger",
      },
      {
        text: "ledger.menu.partyLedger",
        route: "/party-ledger",
      },
      {
        text: "ledger.menu.funderActivity",
        route: "/funder-activity",
      },
      {
        text: "ledger.menu.accountingPeriods",
        route: "/accounting-periods",
      },
      {
        text: "ledger.menu.manualReviewQueue",
        route: "/manual-review-queue",
      },
      {
        text: "ledger.menu.periodExport",
        route: "/period-export",
      },
      {
        text: "ledger.menu.deploymentConfiguration",
        route: "/deployment-configuration",
      },
    ]);
  });

  it("buildLedgerMainMenuEntries uses route values from routes object", () => {
    const routes = {
      ROUTE_GENERAL_LEDGER: "/custom-general-ledger",
      ROUTE_PARTY_LEDGER: "/custom-party-ledger",
      ROUTE_FUNDER_ACTIVITY: "/custom-funder-activity",
      ROUTE_ACCOUNTING_PERIODS: "/custom-accounting-periods",
      ROUTE_MANUAL_REVIEW_QUEUE: "/custom-manual-review-queue",
      ROUTE_PERIOD_EXPORT: "/custom-period-export",
      ROUTE_DEPLOYMENT_CONFIGURATION: "/custom-deployment-configuration",
    };

    const entries = buildLedgerMainMenuEntries(routes);
    
    expect(entries[0].route).toBe("/custom-general-ledger");
    expect(entries[1].route).toBe("/custom-party-ledger");
    expect(entries[2].route).toBe("/custom-funder-activity");
    expect(entries[3].route).toBe("/custom-accounting-periods");
    expect(entries[4].route).toBe("/custom-manual-review-queue");
    expect(entries[5].route).toBe("/custom-period-export");
    expect(entries[6].route).toBe("/custom-deployment-configuration");
  });

  it("each menu entry has text and route properties", () => {
    const routes = {
      ROUTE_GENERAL_LEDGER: "/general-ledger",
      ROUTE_PARTY_LEDGER: "/party-ledger",
      ROUTE_FUNDER_ACTIVITY: "/funder-activity",
      ROUTE_ACCOUNTING_PERIODS: "/accounting-periods",
      ROUTE_MANUAL_REVIEW_QUEUE: "/manual-review-queue",
      ROUTE_PERIOD_EXPORT: "/period-export",
      ROUTE_DEPLOYMENT_CONFIGURATION: "/deployment-configuration",
    };

    const entries = buildLedgerMainMenuEntries(routes);
    
    entries.forEach((entry) => {
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("route");
      expect(typeof entry.text).toBe("string");
      expect(typeof entry.route).toBe("string");
    });
  });

  it("coreMainMenuEntry has all required properties", () => {
    expect(coreMainMenuEntry).toHaveProperty("name");
    expect(coreMainMenuEntry).toHaveProperty("id");
    expect(coreMainMenuEntry).toHaveProperty("text");
    expect(coreMainMenuEntry).toHaveProperty("icon");
    expect(typeof coreMainMenuEntry.name).toBe("string");
    expect(typeof coreMainMenuEntry.id).toBe("string");
    expect(typeof coreMainMenuEntry.text).toBe("string");
    expect(typeof coreMainMenuEntry.icon).toBe("string");
  });
});