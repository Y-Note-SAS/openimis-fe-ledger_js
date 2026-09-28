/**
 * GraphQL string literal for a *user-typed* filter value.
 *
 * The openIMIS `Searcher` forwards `filtersToQueryParams` strings verbatim into
 * the GraphQL operation, so a value interpolated with plain quotes (`name:
 * "…"`) breaks the document as soon as it contains a double quote, a backslash
 * or a line break. `JSON.stringify` produces a valid GraphQL string literal
 * (JSON escaping is a subset of the GraphQL one), which keeps the filter exact
 * and the document parseable.
 */
export const graphqlString = (value) => JSON.stringify(String(value ?? ""));
