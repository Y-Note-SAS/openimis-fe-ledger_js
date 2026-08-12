// Sign convention per spec Clarifications (data-model.md PartyLedgerBalanceViewModel):
// positive balance = owed BY the party (party is a debtor), negative = owed TO the
// party (party is a creditor). The number itself comes from the backend as-is
// (never recomputed/re-signed client-side) — this util only derives display text.
export function formatSignedBalance(balance) {
  const amount = Number(balance) || 0;
  if (amount === 0) {
    return { label: "0", legend: "settled" };
  }
  if (amount > 0) {
    return { label: `+${amount}`, legend: "owedByParty" };
  }
  return { label: `-${Math.abs(amount)}`, legend: "owedToParty" };
}
