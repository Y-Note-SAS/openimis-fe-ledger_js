// ASSUMPTION (data-model.md leaves the exact algorithm unspecified beyond
// "earliest-open/locked-period rule" + spec.md's "chronological-order
// enforcement" goal): periods must be locked oldest-open-first, closed
// oldest-locked-first, and reopened newest-closed-first (the mirror image of
// closing) — so a period is only actionable if it is the chronologically
// extreme member of its own status group. This is a client-side hint only;
// the backend mutation response remains authoritative (FR-009).
export function availableActionsForPeriod(period, allPeriods = []) {
  if (!period) return [];

  const byStartDateAsc = [...allPeriods].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  if (period.status === "open") {
    const earliestOpen = byStartDateAsc.find((p) => p.status === "open");
    return earliestOpen?.id === period.id ? ["lock"] : [];
  }

  if (period.status === "locked") {
    const earliestLocked = byStartDateAsc.find((p) => p.status === "locked");
    return earliestLocked?.id === period.id ? ["close"] : [];
  }

  if (period.status === "closed") {
    const closedPeriods = byStartDateAsc.filter((p) => p.status === "closed");
    const latestClosed = closedPeriods[closedPeriods.length - 1];
    return latestClosed?.id === period.id ? ["reopen"] : [];
  }

  return [];
}
