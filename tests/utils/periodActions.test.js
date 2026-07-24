import { describe, expect, it } from "vitest";
import { availableActionsForPeriod } from "../../src/utils/periodActions";

const periods = [
  { id: "p1", startDate: "2026-01-01", status: "closed" },
  { id: "p2", startDate: "2026-02-01", status: "closed" },
  { id: "p3", startDate: "2026-03-01", status: "locked" },
  { id: "p4", startDate: "2026-04-01", status: "locked" },
  { id: "p5", startDate: "2026-05-01", status: "open" },
  { id: "p6", startDate: "2026-06-01", status: "open" },
];

describe("availableActionsForPeriod", () => {
  it("allows lock only on the chronologically-earliest open period", () => {
    expect(availableActionsForPeriod(periods[4], periods)).toEqual(["lock"]);
    expect(availableActionsForPeriod(periods[5], periods)).toEqual([]);
  });

  it("allows close only on the chronologically-earliest locked period", () => {
    expect(availableActionsForPeriod(periods[2], periods)).toEqual(["close"]);
    expect(availableActionsForPeriod(periods[3], periods)).toEqual([]);
  });

  it("allows reopen only on the most-recently-closed period", () => {
    expect(availableActionsForPeriod(periods[1], periods)).toEqual(["reopen"]);
    expect(availableActionsForPeriod(periods[0], periods)).toEqual([]);
  });

  it("returns an empty array for a falsy period", () => {
    expect(availableActionsForPeriod(null, periods)).toEqual([]);
  });
});
