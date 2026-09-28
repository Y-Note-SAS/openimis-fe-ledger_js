/**
 * Client-side mirror of the rules enforced by the backend `PeriodService.open`
 * (`ledger/services.py`): both dates are required, `start <= end`, the new
 * period must not overlap any existing one, and it must start after the end of
 * the latest existing period. The backend stays authoritative (its rejection is
 * still displayed), but a user must not be able to submit a period that the
 * backend systematically refuses.
 *
 * Returns `{ key, values }` — `key` being the i18n id under
 * `ledger.periods.openForm.errors` — or `null` when the form is still empty or
 * the dates are valid.
 */
export function validateNewAccountingPeriod(startDate, endDate, periods = []) {
  const error = (key, values = {}) => ({ key: `ledger.periods.openForm.errors.${key}`, values });

  // Nothing typed yet: no error to show, the submit button stays disabled.
  if (!startDate && !endDate) return null;

  if (!startDate || !endDate) return error("datesRequired");
  if (startDate > endDate) return error("endBeforeStart");

  const existing = (periods || []).filter((period) => period?.startDate && period?.endDate);
  // Same overlap test as `PeriodService._validate_no_overlap` (inclusive
  // bounds, both sides).
  const overlapping = existing.find((period) => startDate <= period.endDate && endDate >= period.startDate);
  if (overlapping) {
    return error("overlap", { start: overlapping.startDate, end: overlapping.endDate });
  }

  // `PeriodService._validate_chronological_order`: a new period may only start
  // after the end of the latest existing period.
  const latestEnd = existing.reduce(
    (latest, period) => (latest === null || period.endDate > latest ? period.endDate : latest),
    null,
  );
  if (latestEnd && startDate <= latestEnd) {
    return error("chronology", { end: latestEnd });
  }

  return null;
}

export default validateNewAccountingPeriod;
