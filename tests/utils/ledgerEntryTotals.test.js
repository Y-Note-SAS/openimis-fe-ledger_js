import { describe, expect, it } from "vitest";
import { computeLedgerEntryTotals } from "../../src/utils/ledgerEntryTotals";

describe("computeLedgerEntryTotals", () => {
  it("sums debit and credit lines and reports a zero balance for a balanced entry", () => {
    const lines = [
      { debit: 100, credit: null },
      { debit: null, credit: 60 },
      { debit: null, credit: 40 },
    ];
    expect(computeLedgerEntryTotals(lines)).toEqual({ debit: 100, credit: 100, balance: 0 });
  });

  it("reports a non-zero balance for an unbalanced (invalid) entry", () => {
    const lines = [
      { debit: 100, credit: null },
      { debit: null, credit: 40 },
    ];
    expect(computeLedgerEntryTotals(lines)).toEqual({ debit: 100, credit: 40, balance: 60 });
  });

  it("treats missing debit/credit values as zero", () => {
    const lines = [{ debit: 50 }, { credit: 50 }];
    expect(computeLedgerEntryTotals(lines)).toEqual({ debit: 50, credit: 50, balance: 0 });
  });

  it("returns zeroes for an empty lines array", () => {
    expect(computeLedgerEntryTotals([])).toEqual({ debit: 0, credit: 0, balance: 0 });
  });

  it("returns zeroes when called with no argument", () => {
    expect(computeLedgerEntryTotals()).toEqual({ debit: 0, credit: 0, balance: 0 });
  });
});
