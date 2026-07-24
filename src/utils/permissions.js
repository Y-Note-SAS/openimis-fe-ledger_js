import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../constants";

// ASSUMPTION: a finance-administrator can always see everything a
// reporting-only user can see (the spec's two-tier model implies admin is a
// superset for read access; FR-019/FR-020 don't explicitly state this but no
// acceptance scenario shows an admin denied a reporting-only screen).
export const hasLedgerReportingRight = (rights = []) =>
  Array.isArray(rights) && (rights.includes(RIGHT_LEDGER_REPORTING) || rights.includes(RIGHT_LEDGER_ADMIN));

export const hasLedgerAdminRight = (rights = []) => Array.isArray(rights) && rights.includes(RIGHT_LEDGER_ADMIN);
