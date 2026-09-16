/**
 * First `errors[].message` of an openIMIS mutation payload, or null when the
 * mutation succeeded. Mutation payloads return `errors { field message }`; the
 * UI surfaces the backend message verbatim (no rewriting) so the operator sees
 * exactly what the server rejected.
 */
export const firstErrorMessage = (errors) => (errors && errors.length ? errors[0].message : null);
