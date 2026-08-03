import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import AccountingPeriodPicker from "../../src/pickers/AccountingPeriodPicker";

afterEach(() => {
  cleanup();
});

const mockStore = (overrides = {}) => {
  const defaultState = {
    ledger: {
      accountingPeriods: {
        items: [],
        isFetching: false,
        isFetched: false,
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

describe("AccountingPeriodPicker", () => {
  const renderPicker = (props, storeOverrides = {}) => {
    const store = mockStore(storeOverrides);
    return render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <AccountingPeriodPicker {...props} />
        </IntlProvider>
      </Provider>,
    );
  };

  it("renders with default label", () => {
    renderPicker({ value: null, onChange: vi.fn() });
    expect(screen.getByLabelText("ledger.picker.accountingPeriod")).toBeInTheDocument();
  });

  it("renders with periods when available", () => {
    const periods = [
      { id: "1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" },
      { id: "2", startDate: "2026-06-01", endDate: "2026-06-30", status: "closed" },
    ];

    renderPicker(
      { value: null, onChange: vi.fn() },
      { accountingPeriods: { items: periods, isFetching: false, isFetched: true } },
    );

    expect(screen.getByLabelText("ledger.picker.accountingPeriod")).toBeInTheDocument();
  });

  it("renders as read-only when requested", () => {
    renderPicker({ value: null, onChange: vi.fn(), readOnly: true });
    const input = screen.getByLabelText("ledger.picker.accountingPeriod");
    expect(input).toHaveAttribute("readonly");
  });

  it("renders with required indicator", () => {
    renderPicker({ value: null, onChange: vi.fn(), required: true });
    const input = screen.getByLabelText("ledger.picker.accountingPeriod");
    expect(input).toHaveAttribute("required");
  });
});