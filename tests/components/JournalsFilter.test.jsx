import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { applyMiddleware, combineReducers, createStore } from "redux";
import { thunk } from "redux-thunk";
import JournalsFilter from "../../src/components/JournalsFilter";

afterEach(cleanup);

// `value` is what the select option resolves to in the MUI mock.
const TYPES = [{ value: "uuid-2", id: "uuid-2", code: "bank", type: "Bank & Checks Journal", altLanguage: "Banque" }];

/** The journal type picker is connected: it needs a store. */
const store = () =>
  createStore(
    combineReducers({
      ledger: (state = { journalTypes: { items: TYPES, isFetching: false, isFetched: true, error: null } }) => state,
    }),
    applyMiddleware(thunk),
  );

const renderFilter = (filters = {}, onChangeFilters = vi.fn()) => {
  render(
    <Provider store={store()}>
      <IntlProvider locale="en" messages={{}}>
        <JournalsFilter filters={filters} onChangeFilters={onChangeFilters} />
      </IntlProvider>
    </Provider>,
  );
  return onChangeFilters;
};

describe("JournalsFilter", () => {
  it("renders the journal filters", () => {
    renderFilter();

    expect(screen.getByLabelText("ledger.journals.filter.name")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.journals.filter.code")).toBeInTheDocument();
    expect(screen.getByLabelText("autocomplete-options")).toBeInTheDocument();
  });

  it("pushes exact name/code filters while typing", () => {
    const onChangeFilters = renderFilter();

    fireEvent.change(screen.getByLabelText("ledger.journals.filter.name"), { target: { value: "Bank" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "name", value: "Bank", filter: 'name: "Bank"' }]);

    fireEvent.change(screen.getByLabelText("ledger.journals.filter.code"), { target: { value: "BANK" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "code", value: "BANK", filter: 'code: "BANK"' }]);
  });

  it("clears a text filter when the field is emptied", () => {
    const onChangeFilters = renderFilter({ name: { value: "Bank" } });

    fireEvent.change(screen.getByLabelText("ledger.journals.filter.name"), { target: { value: "" } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "name", value: "", filter: null }]);
  });

  it("escapes the typed value so a quote cannot break the GraphQL document", () => {
    const onChangeFilters = renderFilter();

    fireEvent.change(screen.getByLabelText("ledger.journals.filter.name"), { target: { value: 'Bank "comores"' } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([
      { id: "name", value: 'Bank "comores"', filter: 'name: "Bank \\"comores\\""' },
    ]);
  });

  it("maps the journal type to an escaped type_Id filter", () => {
    const onChangeFilters = renderFilter();
    const select = screen.getByLabelText("autocomplete-options");

    fireEvent.change(select, { target: { value: "uuid-2" } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([
      { id: "type", value: expect.objectContaining({ code: "bank" }), filter: 'type_Id: "uuid-2"' },
    ]);
  });
});
