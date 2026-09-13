import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import AccountPicker from "../../src/pickers/AccountPicker";

vi.mock("../../src/actions", () => ({
  fetchAccountOptions: vi.fn(() => () => {}),
}));

import { fetchAccountOptions } from "../../src/actions";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ACCOUNTS = [
  { id: "uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves", type: "EQ", currencies: '["XAF"]' },
  { id: "uuid-2", uuid: "uuid-2", code: "7010", name: "Ventes", type: "IN", currencies: '["XAF"]' },
];

const mockStore = (accountOptions) =>
  createStore(combineReducers({ ledger: (state = { accountOptions }) => state }), applyMiddleware(thunk));

const renderPicker = (
  props = {},
  accountOptions = { items: ACCOUNTS, isFetching: false, isFetched: true, error: null },
) =>
  render(
    <Provider store={mockStore(accountOptions)}>
      <IntlProvider locale="en" messages={{}}>
        <AccountPicker {...props} />
      </IntlProvider>
    </Provider>,
  );

describe("AccountPicker", () => {
  it("renders the default label and lists the loaded accounts", () => {
    const { getByLabelText, getByText, container } = renderPicker({ value: null, onChange: vi.fn() });

    expect(getByLabelText("ledger.picker.account")).toBeInTheDocument();
    expect(container.querySelectorAll("option")).toHaveLength(3);
    expect(getByText("1200 — Reserves")).toBeInTheDocument();
  });

  it("filters out the excluded account types", () => {
    const { container } = renderPicker({ value: null, onChange: vi.fn(), excludeTypes: ["IN", "EX"] });

    expect(container.querySelectorAll("option")).toHaveLength(2);
  });

  it("returns the whole account node on selection", () => {
    const onChange = vi.fn();
    const { getByLabelText } = renderPicker({ value: null, onChange });

    fireEvent.change(getByLabelText("autocomplete-options"), { target: { value: "uuid-2" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ uuid: "uuid-2", code: "7010" }));
  });

  it("fetches the chart of accounts when it is not loaded yet", () => {
    renderPicker({ value: null, onChange: vi.fn() }, { items: [], isFetching: false, isFetched: false, error: null });

    expect(fetchAccountOptions).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the chart of accounts is already loaded", () => {
    renderPicker({ value: null, onChange: vi.fn() });

    expect(fetchAccountOptions).not.toHaveBeenCalled();
  });

  it("resolves a uuid value against the loaded accounts", () => {
    const { getByLabelText } = renderPicker({ value: "uuid-1", onChange: vi.fn() });

    expect(getByLabelText("ledger.picker.account").value).toBe("1200 — Reserves");
  });
});
