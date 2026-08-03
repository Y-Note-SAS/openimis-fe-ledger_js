import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import PartyPicker from "../../src/pickers/PartyPicker";

afterEach(() => {
  cleanup();
});

const mockStore = (overrides = {}) => {
  const defaultState = {
    ledger: {
      partySearch: {
        results: [],
        isFetching: false,
      },
      ...overrides,
    },
  };

  return createStore(
    combineReducers({
      ledger: (state = defaultState.ledger) => state,
    }),
    applyMiddleware(thunk),
  );
};

describe("PartyPicker", () => {
  const renderPicker = (props, storeOverrides = {}) => {
    const store = mockStore(storeOverrides);
    return render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <PartyPicker {...props} />
        </IntlProvider>
      </Provider>,
    );
  };

  it("renders with default label", () => {
    renderPicker({ value: null, onChange: vi.fn() });
    expect(screen.getByLabelText("ledger.picker.party")).toBeInTheDocument();
  });

  it("renders with results when available", () => {
    const results = [
      { analyticValueId: "1", displayName: "Party A", partyType: "individual" },
      { analyticValueId: "2", displayName: "Party B", partyType: "organization" },
    ];

    renderPicker(
      { value: null, onChange: vi.fn() },
      { partySearch: { results, isFetching: false } },
    );

    expect(screen.getByLabelText("ledger.picker.party")).toBeInTheDocument();
  });

  it("handles empty results", () => {
    renderPicker(
      { value: null, onChange: vi.fn() },
      { partySearch: { results: [], isFetching: false } },
    );

    expect(screen.getByLabelText("ledger.picker.party")).toBeInTheDocument();
  });
});