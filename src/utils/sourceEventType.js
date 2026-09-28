/**
 * `LedgerEntryMetaSourceEventType` GraphQL enum names are the upper-cased
 * versions of the stored values (`claim_payment` -> `CLAIM_PAYMENT`).
 *
 * GraphQL only accepts the enum *name*, both as a literal and as a variable
 * value, so the lower-case module constants (used for display and mocks) must
 * be converted before they reach the query.
 */
export const sourceEventTypeEnumName = (value) => (value ? String(value).toUpperCase() : null);
