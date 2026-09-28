// Mirrors the backend rules (PeriodService):
// - `lock`: only the earliest OPEN period (PeriodService._validate_earliest_open_period),
// - `close`: the period must be LOCKED *and* be the earliest period that is not
//   closed, whatever its status (PeriodService.close: "Only a locked accounting
//   period can be closed" + _validate_earliest_non_closed_period). An OPEN
//   period placed before it therefore blocks the closing, so the action must
//   not be offered in that case,
// - `reopen`: only a LOCKED period (PeriodService.reopen -> "Only a locked
//   accounting period can be reopened"): a CLOSED period is final, so offering
//   "reopen" on a closed row only produced a backend rejection.
// This is a client-side hint only; the backend mutation remains authoritative
// (FR-009).
export function availableActionsForPeriod(period, allPeriods = []) {
  if (!period) return [];

  const byStartDateAsc = [...allPeriods].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  if (period.status === "open") {
    const earliestOpen = byStartDateAsc.find((p) => p.status === "open");
    return earliestOpen?.id === period.id ? ["lock"] : [];
  }

  if (period.status === "locked") {
    const earliestNonClosed = byStartDateAsc.find((p) => p.status !== "closed");
    const actions = ["reopen"];
    if (earliestNonClosed?.id === period.id) {
      actions.unshift("close");
    }
    return actions;
  }

  return [];
}
