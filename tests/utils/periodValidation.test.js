import { describe, it, expect } from "vitest";
import { validateNewAccountingPeriod } from "../../src/utils/periodValidation";

const PERIODS = [
  { id: "1", startDate: "2026-06-01", endDate: "2026-06-30" },
  { id: "2", startDate: "2026-07-01", endDate: "2026-07-31" },
];

describe("validateNewAccountingPeriod (mirror of PeriodService.open)", () => {
  it("does not report anything while the form is empty", () => {
    expect(validateNewAccountingPeriod("", "", PERIODS)).toBeNull();
  });

  it("requires both dates", () => {
    expect(validateNewAccountingPeriod("2026-08-01", "", PERIODS).key).toBe(
      "ledger.periods.openForm.errors.datesRequired",
    );
    expect(validateNewAccountingPeriod("", "2026-08-31", PERIODS).key).toBe(
      "ledger.periods.openForm.errors.datesRequired",
    );
  });

  it("rejects an end date before the start date", () => {
    expect(validateNewAccountingPeriod("2026-08-31", "2026-08-01", PERIODS).key).toBe(
      "ledger.periods.openForm.errors.endBeforeStart",
    );
  });

  it("rejects a period overlapping an existing one", () => {
    expect(validateNewAccountingPeriod("2026-07-15", "2026-08-15", PERIODS)).toEqual({
      key: "ledger.periods.openForm.errors.overlap",
      values: { start: "2026-07-01", end: "2026-07-31" },
    });
    // Overlap through the end bound only (June + the first day of July).
    expect(validateNewAccountingPeriod("2026-06-15", "2026-07-01", PERIODS).values).toEqual({
      start: "2026-06-01",
      end: "2026-06-30",
    });
  });

  it("rejects a period that does not start after the latest existing period", () => {
    // No overlap (ends before June), but the backend requires a new period to
    // start after the end of the latest period.
    expect(validateNewAccountingPeriod("2026-04-01", "2026-05-31", PERIODS)).toEqual({
      key: "ledger.periods.openForm.errors.chronology",
      values: { end: "2026-07-31" },
    });
  });

  it("accepts a period starting right after the latest end", () => {
    expect(validateNewAccountingPeriod("2026-08-01", "2026-08-31", PERIODS)).toBeNull();
  });

  it("accepts any period when no period exists yet", () => {
    expect(validateNewAccountingPeriod("2026-01-01", "2026-01-31", [])).toBeNull();
  });
});
