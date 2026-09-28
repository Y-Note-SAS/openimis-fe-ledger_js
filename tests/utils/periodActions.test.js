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

  it("allows close only on the chronologically-earliest locked period, reopen on every locked one", () => {
    expect(availableActionsForPeriod(periods[2], periods)).toEqual(["close", "reopen"]);
    expect(availableActionsForPeriod(periods[3], periods)).toEqual(["reopen"]);
  });

  it("withholds close when an earlier period is still open (backend closes the earliest non-closed one)", () => {
    const withEarlierOpen = [
      { id: "p1", startDate: "2026-01-01", status: "open" },
      { id: "p2", startDate: "2026-02-01", status: "locked" },
    ];

    // p2 is locked but p1 (earlier, still open) blocks the closing server-side.
    expect(availableActionsForPeriod(withEarlierOpen[1], withEarlierOpen)).toEqual(["reopen"]);
    expect(availableActionsForPeriod(withEarlierOpen[0], withEarlierOpen)).toEqual(["lock"]);
  });

  it("offers no action on a closed period (the backend only reopens locked periods)", () => {
    expect(availableActionsForPeriod(periods[0], periods)).toEqual([]);
    expect(availableActionsForPeriod(periods[1], periods)).toEqual([]);
  });

  it("returns an empty array for a falsy period", () => {
    expect(availableActionsForPeriod(null, periods)).toEqual([]);
  });
});
