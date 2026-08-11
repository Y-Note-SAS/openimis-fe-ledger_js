export const MODULE_NAME = "ledger";

// NOTE (research.md §3 — PROVISIONAL): openimis-be-ledger_py's ledger/apps.py
// DEFAULT_CFG currently defines no RIGHT_ constants at all (backend module is
// still a stub). These two numeric values are placeholders in a currently
// unused range so this frontend can be permission-gated now; they MUST be
// reconciled against the backend's real right constants once
// openimis-be-ledger_py publishes them — a colliding number would silently
// break another module's permission.
export const RIGHT_LEDGER_REPORTING = 158001;
export const RIGHT_LEDGER_ADMIN = 158002;

export const DEFAULT_PAGE_SIZE = 10;
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const DEFUALT_DEBOUNCE_TIME = 300;

// Mirrors backend LedgerEntryFilters.sourceEventType (data-model.md)
export const SOURCE_EVENT_TYPE = {
  CLAIM_PAYMENT: "claim_payment",
  INVOICE: "invoice",
  PAYROLL_DISBURSEMENT: "payroll_disbursement",
  PAYMENT_POINT_RECONCILIATION: "payment_point_reconciliation",
  CLOSING_ENTRY: "closing_entry",
  CORRECTION: "correction",
};

// Mirrors backend AccountingPeriod.status (data-model.md)
export const ACCOUNTING_PERIOD_STATUS = {
  OPEN: "open",
  LOCKED: "locked",
  CLOSED: "closed",
};

// Mirrors backend ManualReviewQueueItem.status (data-model.md)
export const MANUAL_REVIEW_STATUS = {
  PENDING: "pending",
  RESOLVED: "resolved",
};

// Mirrors backend ManualReviewQueueItem.targetSystem (data-model.md) — an
// extensible list per FR-017's "not hardcoded" intent for external systems;
// kept here as the two currently-known values pending the reference-data
// query (externalSystems) also used by Deployment Configuration.
export const REPLICATION_TARGET_SYSTEM = {
  ODOO: "odoo",
  SAGE: "sage",
};

// Mirrors backend ExportJob.format (data-model.md / contracts/graphql-operations.md)
export const EXPORT_FORMAT = {
  OHADA_FEC: "ohada_fec",
  GENERIC: "generic",
};

// Mirrors backend ExportJob.status (data-model.md)
export const EXPORT_JOB_STATUS = {
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
  FAILED: "failed",
};

// Mirrors backend DeploymentConfiguration.operatingMode (data-model.md)
export const OPERATING_MODE = {
  LOCAL_ONLY: "local_only",
  REPLICATED: "replicated",
};

// Accounting period lifecycle actions (data-model.md AccountingPeriodViewModel.availableActions)
export const PERIOD_ACTION = {
  LOCK: "lock",
  CLOSE: "close",
  REOPEN: "reopen",
};

// Export job polling interval in ms (research.md §5)
export const EXPORT_JOB_POLL_INTERVAL_MS = 3000;

// Set to false when the ledger backend export API is available. The page keeps
// the real export actions untouched and only swaps the demo process here.
export const USE_MOCK_EXPORT = true;
export const MOCK_EXPORT_POLL_INTERVAL_MS = 1000;

// Set to false when the deployment configuration backend is connected.
export const USE_MOCK_DEPLOYMENT = true;
