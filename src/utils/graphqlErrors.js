/**
 * First `errors[].message` of an openIMIS mutation payload, or null when the
 * mutation succeeded. Mutation payloads return `errors { field message }`; the
 * UI surfaces the backend message verbatim (no rewriting) so the operator sees
 * exactly what the server rejected.
 */
import { formatGraphQLError } from "@openimis/fe-core";

export const firstErrorMessage = (errors) => (errors && errors.length ? errors[0].message : null);

/**
 * Message to display for a failed *query*: fe-core's `formatGraphQLError`
 * returns `{code, message: "Server returned data error status", detail}` where
 * `detail` carries the actual GraphQL messages, so prefer it over the generic
 * `message`.
 */
export const graphqlErrorMessage = (payload) => {
  const error = formatGraphQLError(payload);
  if (!error) return null;
  return error.detail || error.message || null;
};
