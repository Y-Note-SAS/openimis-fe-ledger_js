/**
 * `Account.currencies` is a JSONString in the GraphQL schema (hordak stores the
 * list in a JSONField), so the same value may arrive as an array (mocks, local
 * state) or as a JSON-encoded string (backend). Normalize it before displaying
 * or aggregating it.
 */
export const parseCurrencies = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Distinct currency codes already used by the loaded accounts (sorted). */
export const collectCurrencyCodes = (accounts = []) =>
  Array.from(
    new Set((accounts || []).flatMap((account) => parseCurrencies(account?.currencies)).filter(Boolean)),
  ).sort();

/** GraphQL `JSONString` input for `currencies`, e.g. `["XAF","EUR"]`. */
export const formatCurrenciesInput = (codes = []) => JSON.stringify((codes || []).filter(Boolean));
