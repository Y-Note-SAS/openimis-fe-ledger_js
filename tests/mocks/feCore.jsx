import React, { useEffect, useRef } from "react";
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

/** The period register download goes through a REST call + a blob link. */
export const baseApiUrl = "/api";
export const openBlob = vi.fn((data, filename, mime) => ({ data, filename, mime }));

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

// Minimal stand-in for the CoreModule Searcher: like the real component it
// calls `fetch` once on mount with the params built by `filtersToQueryParams`,
// and it renders the table title, the headers and the rows produced by
// `itemFormatters` so page tests keep exercising the real formatters.
export const Searcher = ({
  filtersToQueryParams,
  fetch,
  items,
  headers,
  itemFormatters,
  rowIdentifier,
  tableTitle,
  defaultPageSize = 10,
  defaultOrderBy = null,
}) => {
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const state = {
      filters: {},
      page: 0,
      pageSize: defaultPageSize,
      afterCursor: null,
      beforeCursor: null,
      orderBy: defaultOrderBy,
    };
    fetch?.(filtersToQueryParams ? filtersToQueryParams(state) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerList = typeof headers === "function" ? headers() : headers || [];
  const formatters = typeof itemFormatters === "function" ? itemFormatters() : itemFormatters || [];
  return (
    <div className="mock-searcher">
      {tableTitle ? <div>{tableTitle}</div> : null}
      <table>
        <thead>
          <tr>
            {headerList.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(items || []).map((item, index) => {
            const key = rowIdentifier ? rowIdentifier(item) : index;
            return (
              <tr key={key ?? index}>
                {formatters.map((formatter, formatterIndex) => (
                  <td key={formatterIndex}>{formatter(item, index)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export const ControlledField = ({ field }) => field ?? null;

export const GRID_RESPONSIVE_STANDARD = { xs: 12, sm: 6, md: 4, lg: 3 };

export const dispatchMutationReq = (state, action) => {
  const meta = action.meta || {};
  const requestedDateTime =
    meta.requestedDateTime instanceof Date ? meta.requestedDateTime.toISOString() : meta.requestedDateTime;
  return {
    ...state,
    submittingMutation: true,
    mutation: { ...meta, requestedDateTime, id: meta.id || meta.clientMutationId || null },
  };
};

export const dispatchMutationResp = (state, service, action) => {
  const prevMutation = state.mutation || {};
  return {
    ...state,
    submittingMutation: false,
    mutation: {
      ...state.mutation,
      id: action.payload?.data?.[service]?.internalId ?? prevMutation.id ?? null,
    },
  };
};

export const dispatchMutationErr = (state, action) => ({ ...state, alert: JSON.stringify(action.payload) });

export const coreConfirm = vi.fn();
export const journalize = vi.fn();
export const clearCurrentPaginationPage = vi.fn(() => ({ type: "MOCK_CLEAR_PAGE" }));
