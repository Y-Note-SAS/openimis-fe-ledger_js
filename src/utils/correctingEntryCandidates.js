// ASSUMPTION: `LedgerEntryViewModel` has no flat `partyAnalyticValueId`/
// `accountingPeriodId` fields of its own (data-model.md only gives it a
// nested `accountingPeriod: { id, status }` and per-line `partyTag`); this
// util interprets "the entry's party" as "any of its lines is tagged with
// that party" and "the entry's period" as `entry.accountingPeriod.id`, per
// the client-side validation rule in data-model.md (a UX-level pre-filter —
// the backend mutation remains the authoritative validator, Edge Cases).
export function filterCorrectingEntryCandidates(ledgerEntries = [], originalEntry) {
  if (!originalEntry) return [];
  const { partyAnalyticValueId, accountingPeriodId } = originalEntry;

  return ledgerEntries.filter(
    (entry) =>
      entry.accountingPeriod?.id === accountingPeriodId &&
      (entry.lines || []).some((line) => line.partyTag?.analyticValueId === partyAnalyticValueId),
  );
}
