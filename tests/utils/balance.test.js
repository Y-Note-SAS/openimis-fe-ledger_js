import { describe, expect, it } from "vitest";
import { formatSignedBalance } from "../../src/utils/balance";

describe("formatSignedBalance", () => {
  it("labels a positive balance as owed by the party, with an explicit plus sign", () => {
    expect(formatSignedBalance(150)).toEqual({ label: "+150", legend: "owedByParty" });
  });

  it("labels a negative balance as owed to the party, with an explicit minus sign", () => {
    expect(formatSignedBalance(-150)).toEqual({ label: "-150", legend: "owedToParty" });
  });

  it("labels a zero balance as settled", () => {
    expect(formatSignedBalance(0)).toEqual({ label: "0", legend: "settled" });
  });

  it("treats a missing/non-numeric balance as zero", () => {
    expect(formatSignedBalance(undefined)).toEqual({ label: "0", legend: "settled" });
    expect(formatSignedBalance(null)).toEqual({ label: "0", legend: "settled" });
  });
});
