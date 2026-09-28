const findOriginalLedgerEntry = (item, ledgerEntries = []) =>
  ledgerEntries.find((entry) => entry.id === item?.originalEntry?.id) || null;

const findAccountingPeriod = (item, accountingPeriods = []) =>
  accountingPeriods.find((period) => period.id === item?.originalEntry?.accountingPeriodId) || null;

const findPartyTag = (item, entry) =>
  (entry?.lines || [])
    .map((line) => line.partyTag)
    .find((partyTag) => partyTag?.analyticValueId === item?.originalEntry?.partyAnalyticValueId) || null;

export function getManualReviewOriginalEntryDisplay(item, ledgerEntries = [], accountingPeriods = []) {
  const entry = findOriginalLedgerEntry(item, ledgerEntries);
  const period = findAccountingPeriod(item, accountingPeriods);
  const partyTag = findPartyTag(item, entry);

  return {
    reference: entry?.sourceEventReference || `#${item.originalEntry.id}`,
    period: period ? `${period.startDate} — ${period.endDate}` : `#${item.originalEntry.accountingPeriodId}`,
    party: partyTag?.displayName || item.originalEntry.partyAnalyticValueId,
    journal: entry?.journal?.code || entry?.journal?.name || "—",
    postedAt: entry?.postedAt || "—",
  };
}
