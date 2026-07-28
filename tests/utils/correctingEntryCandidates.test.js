import { describe, expect, it } from "vitest";
import { filterCorrectingEntryCandidates } from "../../src/utils/correctingEntryCandidates";

const entries = [
  {
    id: "e1",
    accountingPeriod: { id: "p1" },
    lines: [{ partyTag: { analyticValueId: "party-1" } }],
  },
  {
    id: "e2",
    accountingPeriod: { id: "p1" },
    lines: [{ partyTag: { analyticValueId: "party-2" } }],
  },
  {
    id: "e3",
    accountingPeriod: { id: "p2" },
    lines: [{ partyTag: { analyticValueId: "party-1" } }],
  },
];

describe("filterCorrectingEntryCandidates", () => {
  it("keeps only entries matching both the original entry's party and period", () => {
    const candidates = filterCorrectingEntryCandidates(entries, {
      partyAnalyticValueId: "party-1",
      accountingPeriodId: "p1",
    });
    expect(candidates.map((e) => e.id)).toEqual(["e1"]);
  });

  it("returns an empty array without an original entry", () => {
    expect(filterCorrectingEntryCandidates(entries, null)).toEqual([]);
  });

  it("returns an empty array when no entries match", () => {
    const candidates = filterCorrectingEntryCandidates(entries, {
      partyAnalyticValueId: "party-99",
      accountingPeriodId: "p1",
    });
    expect(candidates).toEqual([]);
  });
});
