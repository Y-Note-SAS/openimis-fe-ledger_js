import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import JournalTypePicker from "../../src/pickers/JournalTypePicker";

vi.mock("../../src/actions", () => ({
  fetchJournalTypes: vi.fn(() => () => {}),
}));

import { fetchJournalTypes } from "../../src/actions";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Decoded ids, as stored by the reducer.
const TYPES = [
  { id: "uuid-1", code: "sales", type: "Sales", altLanguage: "Vente" },
  { id: "uuid-2", code: "bank", type: "Bank & Checks Journal", altLanguage: "Journal de banque et chèque" },
];

const mockStore = (journalTypes) =>
  createStore(combineReducers({ ledger: (state = { journalTypes }) => state }), applyMiddleware(thunk));

const renderPicker = (
  props = {},
  journalTypes = { items: TYPES, isFetching: false, isFetched: true, error: null },
  messages = {},
) =>
  render(
    <Provider store={mockStore(journalTypes)}>
      <IntlProvider locale="en" messages={messages}>
        <JournalTypePicker {...props} />
      </IntlProvider>
    </Provider>,
  );

describe("JournalTypePicker", () => {
  it("does not retry the request after a failure (no request loop)", () => {
    renderPicker({}, { items: [], isFetching: false, isFetched: false, error: "Network error" });

    expect(fetchJournalTypes).not.toHaveBeenCalled();
  });

  it("renders the default label and the backend journal types", () => {
    const { container } = renderPicker({ value: null, onChange: vi.fn() });

    expect(screen.getByLabelText("ledger.picker.journalType")).toBeInTheDocument();
    expect(container.querySelectorAll("option")).toHaveLength(TYPES.length + 1);
  });

  it("translates the label from the journal type code when a key exists", () => {
    renderPicker({ value: null, onChange: vi.fn() }, undefined, { "ledger.journalType.sales": "Ventes (traduit)" });

    expect(screen.getByText("Ventes (traduit)")).toBeInTheDocument();
  });

  it("falls back to the backend altLanguage/type when no translation exists", () => {
    renderPicker({ value: null, onChange: vi.fn() });

    expect(screen.getByText("Vente")).toBeInTheDocument();
  });

  it("returns the whole journal type node on selection", () => {
    const onChange = vi.fn();
    renderPicker({ value: null, onChange });

    // The mocked Autocomplete keys its options by the first available of
    // value/uuid/code/id, i.e. the journal type code here.
    fireEvent.change(screen.getByLabelText("autocomplete-options"), { target: { value: "sales" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "uuid-1", code: "sales" }));
  });

  it("fetches the journal types when they are not loaded yet", () => {
    renderPicker({ value: null, onChange: vi.fn() }, { items: [], isFetching: false, isFetched: false, error: null });

    expect(fetchJournalTypes).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the journal types are already loaded", () => {
    renderPicker({ value: null, onChange: vi.fn() });

    expect(fetchJournalTypes).not.toHaveBeenCalled();
  });
});
