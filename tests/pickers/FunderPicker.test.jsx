import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import FunderPicker from "../../src/pickers/FunderPicker";

afterEach(() => {
  cleanup();
});

const mockStore = (overrides = {}) => {
  const defaultState = {
    ledger: {
      funderSearch: {
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

describe("FunderPicker", () => {
  const renderPicker = (props, storeOverrides = {}) => {
    const store = mockStore(storeOverrides);
    return render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <FunderPicker {...props} />
        </IntlProvider>
      </Provider>,
    );
  };

  it("renders with default label", () => {
    renderPicker({ value: null, onChange: vi.fn() });
    expect(screen.getByLabelText("ledger.picker.funder")).toBeInTheDocument();
  });

  it("renders with results when available", () => {
    const results = [
      { analyticValueId: "1", displayName: "Funder A" },
      { analyticValueId: "2", displayName: "Funder B" },
    ];

    renderPicker(
      { value: null, onChange: vi.fn() },
      { funderSearch: { results, isFetching: false } },
    );

    expect(screen.getByLabelText("ledger.picker.funder")).toBeInTheDocument();
  });

  it("handles empty results", () => {
    renderPicker({ value: null, onChange: vi.fn() });

    expect(screen.getByLabelText("ledger.picker.funder")).toBeInTheDocument();
  });
});
