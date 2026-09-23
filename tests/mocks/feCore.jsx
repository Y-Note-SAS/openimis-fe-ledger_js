import React from "react";
import { vi } from "vitest";

export const decodeId = (id) => (typeof id === "string" && id.startsWith("enc:") ? id.slice(4) : id);

export const formatServerError = (payload) => (payload ? { message: payload.message || "Server error" } : null);

export const formatGraphQLError = (payload) => {
  const errors = payload?.data?.errors || payload?.errors;
  return errors && errors.length ? { message: errors.map((e) => e.message).join(", ") } : null;
};

export const formatMessage = (intl, module, id) => id;

export const formatMessageWithValues = (intl, module, id, values) => id;

export const formatAmount = (mm, intl, amount) => String(amount ?? 0);

export const graphqlWithVariables = vi.fn((operation, variables, type, params) => ({
  type: "MOCK_THUNK",
  operation,
  variables,
  actionTypes: type,
  params,
}));

export const graphql = vi.fn((payload, type, params) => ({ type: "MOCK_THUNK", payload, actionTypes: type, params }));

export const formatMutation = vi.fn((name, gqlArgs, label) => ({
  payload: `mutation { ${name}(${gqlArgs}) { clientMutationId } }`,
  clientMutationId: "mock-client-mutation-id",
}));

export const withModulesManager = (Component) => (props) => (
  <Component {...props} modulesManager={{ getConf: () => null }} />
);

export const withHistory = (Component) => (props) => <Component {...props} history={{ push: vi.fn() }} />;

export const historyPush = vi.fn();

export const GetIconComponent = (name) => (props) => <span data-icon={name} {...props} />;

export const Helmet = () => null;

export const FormattedMessage = ({ id }) => <>{id}</>;

export const TextInput = ({ label, value, onChange, readOnly }) => (
  <input aria-label={label} value={value ?? ""} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
);

export const SelectInput = ({ label, value, options, onChange }) => (
  <select aria-label={label} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
    {(options || []).map((opt) => (
      <option key={String(opt.value)} value={opt.value ?? ""}>
        {opt.label}
      </option>
    ))}
  </select>
);

export const PublishedComponent = ({ pubRef, ...props }) => {
  if (pubRef === "core.DatePicker") {
    // Minimal stand-in for CoreModule's DatePicker: a text input that emits
    // ISO date strings through onChange (the real picker does the same).
    return (
      <input
        aria-label={props.label}
        value={props.value ?? ""}
        onChange={(event) => props.onChange?.(event.target.value)}
      />
    );
  }
  return null;
};

export const Searcher = () => null;
export const ControlledField = ({ field }) => field ?? null;

export const GRID_RESPONSIVE_STANDARD = { xs: 12, sm: 6, md: 4, lg: 3 };

export const coreConfirm = vi.fn();
export const journalize = vi.fn();
export const clearCurrentPaginationPage = vi.fn(() => ({ type: "MOCK_CLEAR_PAGE" }));
