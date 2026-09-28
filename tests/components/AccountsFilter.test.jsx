import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import AccountsFilter from "../../src/components/AccountsFilter";

afterEach(cleanup);

const renderFilter = (filters = {}, onChangeFilters = vi.fn()) => {
  render(
    <IntlProvider locale="en" messages={{}}>
      <AccountsFilter filters={filters} onChangeFilters={onChangeFilters} />
    </IntlProvider>,
  );
  return onChangeFilters;
};

describe("AccountsFilter", () => {
  it("renders the three server-side filters of the accounts connection", () => {
    renderFilter();

    expect(screen.getByLabelText("ledger.accounts.filter.code")).toBeInTheDocument();
    expect(screen.getByLabelText("autocomplete-options")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.accounts.filter.isBankAccount")).toBeInTheDocument();
  });

  it("prefills the fields from the applied filters", () => {
    renderFilter({ code: { value: "1200" }, type: { value: "EQ" }, isBankAccount: { value: false } });

    expect(screen.getByLabelText("ledger.accounts.filter.code")).toHaveValue("1200");
    // The type picker is an Autocomplete: its value lives on the select.
    expect(screen.getByLabelText("autocomplete-options")).toHaveValue("EQ");
    expect(screen.getByLabelText("ledger.accounts.filter.isBankAccount")).toHaveValue("false");
  });

  it("pushes an exact `code` filter while typing", () => {
    const onChangeFilters = renderFilter();

    fireEvent.change(screen.getByLabelText("ledger.accounts.filter.code"), { target: { value: "1200" } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "code", value: "1200", filter: 'code: "1200"' }]);
  });

  it("escapes the typed value so a quote cannot break the GraphQL document", () => {
    const onChangeFilters = renderFilter();

    fireEvent.change(screen.getByLabelText("ledger.accounts.filter.code"), { target: { value: '12"00' } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "code", value: '12"00', filter: 'code: "12\\"00"' }]);
  });

  it("clears the `code` filter when the field is emptied", () => {
    const onChangeFilters = renderFilter({ code: { value: "1200" } });

    fireEvent.change(screen.getByLabelText("ledger.accounts.filter.code"), { target: { value: "" } });

    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "code", value: "", filter: null }]);
  });

  it("maps the account type to the `type` filter and back to the sentinel when cleared", () => {
    const onChangeFilters = renderFilter();
    const select = screen.getByLabelText("autocomplete-options");

    fireEvent.change(select, { target: { value: "AS" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "type", value: "AS", filter: "type: AS" }]);

    fireEvent.change(select, { target: { value: "__any__" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "type", value: "__any__", filter: null }]);
  });

  it("maps the bank-account select to a boolean filter, `any` clearing it", () => {
    const onChangeFilters = renderFilter();
    const select = screen.getByLabelText("ledger.accounts.filter.isBankAccount");

    fireEvent.change(select, { target: { value: "true" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([
      { id: "isBankAccount", value: true, filter: "isBankAccount: true" },
    ]);

    fireEvent.change(select, { target: { value: "false" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([
      { id: "isBankAccount", value: false, filter: "isBankAccount: false" },
    ]);

    fireEvent.change(select, { target: { value: "" } });
    expect(onChangeFilters).toHaveBeenLastCalledWith([{ id: "isBankAccount", value: null, filter: null }]);
  });
});
