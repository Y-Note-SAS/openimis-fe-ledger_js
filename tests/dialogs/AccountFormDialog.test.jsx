import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import AccountFormDialog from "../../src/dialogs/AccountFormDialog";
import { ACCOUNT_TYPE } from "../../src/constants";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderDialog = (props = {}) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <AccountFormDialog open onClose={vi.fn()} onSubmit={vi.fn()} {...props} />
    </IntlProvider>,
  );

const ACCOUNT = {
  id: "uuid-1",
  uuid: "uuid-1",
  name: "Reserves",
  code: "1200",
  fullCode: "1200",
  type: ACCOUNT_TYPE.EQUITY,
  isBankAccount: true,
  currencies: ["XAF", "EUR"],
};

describe("AccountFormDialog", () => {
  it("renders the creation form with the instance currency as a suggestion", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    expect(screen.getByText("ledger.accounts.form.createTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue("");
    expect(screen.getByLabelText("ledger.accountType")).toBeInTheDocument();
  });

  it("prefills every field when editing an account", () => {
    renderDialog({ account: ACCOUNT });

    expect(screen.getByText("ledger.accounts.form.editTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue("Reserves");
    expect(screen.getByLabelText("ledger.accounts.form.code")).toHaveValue("1200");
    expect(screen.getByLabelText("ledger.accounts.form.fullCode")).toHaveValue("1200");
    expect(screen.getByLabelText("ledger.accounts.form.isBankAccount")).toBeChecked();
  });

  it("keeps the save button disabled until every required field is filled", () => {
    const onSubmit = vi.fn();
    renderDialog({ account: null, currencyOptions: ["XAF"], onSubmit });

    const save = screen.getByRole("button", { name: "ledger.accounts.create.submit" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ledger.accounts.form.name"), { target: { value: "Caisse" } });
    fireEvent.change(screen.getByLabelText("ledger.accounts.form.code"), { target: { value: "570" } });
    fireEvent.change(screen.getByLabelText("ledger.accounts.form.fullCode"), { target: { value: "570" } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("autocomplete-options-multiple"), { target: { value: "XAF" } });
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Caisse",
      code: "570",
      fullCode: "570",
      type: ACCOUNT_TYPE.ASSET,
      isBankAccount: false,
      currencies: ["XAF"],
    });
  });

  it("submits the edited values with the account type and bank flag", () => {
    const onSubmit = vi.fn();
    renderDialog({ account: ACCOUNT, onSubmit });

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.form.save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reserves",
      code: "1200",
      fullCode: "1200",
      type: ACCOUNT_TYPE.EQUITY,
      isBankAccount: true,
      currencies: ["XAF", "EUR"],
    });
  });

  it("caps the account code at the hordak column length", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    expect(screen.getByLabelText("ledger.accounts.form.code")).toHaveAttribute("maxLength", "6");
  });

  it("forces and locks the asset type when the account is a bank account", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    fireEvent.click(screen.getByLabelText("ledger.accounts.form.isBankAccount"));

    // hordak check constraint: bank_accounts_are_asset_accounts
    const typeSelect = screen.getByLabelText("autocomplete-options");
    expect(typeSelect).toBeDisabled();
    expect(typeSelect.value).toBe("AS");
  });

  it("shows the backend rejection inside the dialog and disables the actions while submitting", () => {
    renderDialog({ account: ACCOUNT, error: "Account is used by 12 legs", submitting: true });

    expect(screen.getByText(/Account is used by 12 legs/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ledger.accounts.form.save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ledger.accounts.form.cancel" })).toBeDisabled();
  });

  it("closes through the cancel button", () => {
    const onClose = vi.fn();
    renderDialog({ account: ACCOUNT, onClose });

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.form.cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
