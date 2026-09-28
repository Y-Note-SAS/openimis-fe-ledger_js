import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import LedgerJournalPicker from "../../src/pickers/LedgerJournalPicker";

vi.mock("../../src/actions", () => ({
  fetchJournals: vi.fn(() => () => {}),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const defaultJournalSearch = { results: [], isFetching: false, fetchedType: null };

const mockStore = (journalSearch = defaultJournalSearch) =>
  createStore(combineReducers({ ledger: (state = { journalSearch }) => state }), applyMiddleware(thunk));

describe("LedgerJournalPicker", () => {
  const renderPicker = (props, journalSearch) => {
    const store = mockStore(journalSearch);
    return render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerJournalPicker {...props} />
        </IntlProvider>
      </Provider>,
    );
  };

  it("renders the field with the default label", () => {
    renderPicker({ value: null, onChange: vi.fn() });
    expect(screen.getByLabelText("ledger.picker.journal")).toBeInTheDocument();
  });

  it("shows the selected journal and clears the text when the value is reset", () => {
    const results = [
      { id: "1", code: "BANK", name: "Bank" },
      { id: "2", code: "CASH", name: "Cash" },
    ];
    const journalSearch = { results, isFetching: false, fetchedType: null };
    const { rerender } = renderPicker(
      { value: { id: "1", code: "BANK", name: "Bank" }, onChange: vi.fn() },
      journalSearch,
    );
    const input = screen.getByLabelText("ledger.picker.journal");
    expect(input.value).toBe("Bank");

    rerender(
      <Provider store={mockStore(journalSearch)}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerJournalPicker value={null} onChange={vi.fn()} />
        </IntlProvider>
      </Provider>,
    );
    expect(input.value).toBe("");
  });

  it("filters the options by code as the user types (client-side filter)", () => {
    const results = [
      { id: "1", code: "BANK", name: "Bank" },
      { id: "2", code: "CASH", name: "Cash" },
      { id: "3", code: "MOBILE", name: "Mobile Money" },
    ];
    renderPicker({ value: null, onChange: vi.fn() }, { results, isFetching: false, fetchedType: null });
    const input = screen.getByLabelText("ledger.picker.journal");
    expect(screen.getByText("Bank")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "CASH" } });

    expect(screen.queryByText("Bank")).not.toBeInTheDocument();
    expect(screen.queryByText("Mobile Money")).not.toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("renders the field as disabled when readOnly is set", () => {
    renderPicker({ value: "BANK", onChange: vi.fn(), readOnly: true });
    expect(screen.getByLabelText("ledger.picker.journal")).toBeDisabled();
  });
});
