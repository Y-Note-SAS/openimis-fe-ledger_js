// Pure function computing { debit, credit, balance } from a
// LedgerEntryViewModel.lines array (data-model.md). A valid posted entry
// always has balance === 0 (debit === credit) since the backend/Hordak
// enforces the double-entry invariant server-side; a non-zero balance here
// signals a rendering/mapping bug in this module, not a legitimate business
// state (data-model.md, LedgerEntryViewModel.totals).
export function computeLedgerEntryTotals(lines = []) {
  const debit = lines.reduce((sum, line) => sum + (Number(line?.debit) || 0), 0);
  const credit = lines.reduce((sum, line) => sum + (Number(line?.credit) || 0), 0);
  return {
    debit,
    credit,
    balance: debit - credit,
  };
}
