import { describe, expect, it } from "vitest";
import { hasLedgerReportingRight, hasLedgerAdminRight } from "../../src/utils/permissions";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../../src/constants";

describe("hasLedgerReportingRight", () => {
  it("is true when the user holds the reporting right", () => {
    expect(hasLedgerReportingRight([RIGHT_LEDGER_REPORTING])).toBe(true);
  });

  it("is true when the user holds the admin right (superset assumption)", () => {
    expect(hasLedgerReportingRight([RIGHT_LEDGER_ADMIN])).toBe(true);
  });

  it("is false with neither right", () => {
    expect(hasLedgerReportingRight([1, 2, 3])).toBe(false);
  });

  it("is false with no rights array", () => {
    expect(hasLedgerReportingRight()).toBe(false);
  });
});

describe("hasLedgerAdminRight", () => {
  it("is true only with the admin right", () => {
    expect(hasLedgerAdminRight([RIGHT_LEDGER_ADMIN])).toBe(true);
  });

  it("is false with only the reporting right", () => {
    expect(hasLedgerAdminRight([RIGHT_LEDGER_REPORTING])).toBe(false);
  });
});
