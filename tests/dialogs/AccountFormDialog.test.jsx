import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { applyMiddleware, combineReducers, createStore } from "redux";
import { thunk } from "redux-thunk";
import AccountFormDialog from "../../src/dialogs/AccountFormDialog";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { ACCOUNT_TYPE } from "../../src/constants";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* The dialog embeds the connected `AccountPicker` (parent account), so it needs
   a store; the chart of accounts is seeded through the real reducer. */
const PARENT_ACCOUNT = {
  id: "parent-id",
  uuid: "parent-uuid",
  name: "Ventes",
  code: "7010",
  fullCode: "7010",
  type: ACCOUNT_TYPE.INCOME,
  isBankAccount: false,
  currencies: ["XAF"],
};

const LIABILITY_ACCOUNT = {
  id: "liability-id",
  uuid: "liability-uuid",
  name: "Fournisseurs",
  code: "4510",
  fullCode: "4510",
  type: ACCOUNT_TYPE.LIABILITY,
  isBankAccount: false,
  currencies: ["XAF"],
};

const store = (options = [PARENT_ACCOUNT, LIABILITY_ACCOUNT]) => {
  // The connected pickers read `state.ledger.*`, exactly like the module does.
  const instance = createStore(combineReducers({ ledger: reducer }), applyMiddleware(thunk));
  instance.dispatch({
    type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_RESP`,
    payload: { data: { accounts: { edges: options.map((node) => ({ node })) } } },
  });
  return instance;
};

const renderDialog = (props = {}) =>
  render(
    <Provider store={store()}>
      <IntlProvider locale="en" messages={{}}>
        <AccountFormDialog open onClose={vi.fn()} onSubmit={vi.fn()} {...props} />
      </IntlProvider>
    </Provider>,
  );

/**
 * The MUI `Autocomplete` mock renders one `select` next to the labelled input:
 * target it through its label so a field reorder cannot break the test.
 */
const selectFor = (label) => screen.getByLabelText(label).parentElement.querySelector("select");

const ACCOUNT = {
  id: "uuid-1",
  uuid: "uuid-1",
  name: "Reserves",
  code: "1200",
  fullCode: "1200",
  parent: PARENT_ACCOUNT,
  type: ACCOUNT_TYPE.EQUITY,
  isBankAccount: true,
  currencies: ["XAF", "EUR"],
};

describe("AccountFormDialog", () => {
  it("renders the creation form without any fullCode field", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    expect(screen.getByText("ledger.accounts.form.createTitle")).toBeInTheDocument();
    // The title band is styled on the DialogTitle itself (portal-safe).
    expect(screen.getByText("ledger.accounts.form.createTitle").closest("h2")).toHaveAttribute(
      "id",
      "ledger-account-form-title",
    );
    expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue("");
    // `fullCode` is derived by the backend: no input for it anymore.
    expect(screen.queryByLabelText("ledger.accounts.form.fullCode")).toBeNull();
    expect(screen.getByLabelText("ledger.accounts.form.parent")).toBeInTheDocument();
  });

  it("prefills every field when editing an account and freezes its parent and type", () => {
    renderDialog({ account: ACCOUNT });

    expect(screen.getByText("ledger.accounts.form.editTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue("Reserves");
    expect(screen.getByLabelText("ledger.accounts.form.code")).toHaveValue("1200");
    expect(screen.getByLabelText("ledger.accounts.form.isBankAccount")).toBeChecked();
    // Re-parenting through `updateAccount` corrupts the MPTT tree backend-side.
    expect(selectFor("ledger.accounts.form.parent")).toBeDisabled();
    // A child's type is imposed by its parent (check_account_type trigger):
    // editable in name only, in edition as well as in creation.
    expect(selectFor("ledger.accountType")).toBeDisabled();
  });

  it("keeps the save button disabled until every required field is filled", () => {
    const onSubmit = vi.fn();
    renderDialog({ account: null, currencyOptions: ["XAF"], onSubmit });

    const save = screen.getByRole("button", { name: "ledger.accounts.create.submit" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ledger.accounts.form.name"), { target: { value: "Caisse" } });
    fireEvent.change(screen.getByLabelText("ledger.accounts.form.code"), { target: { value: "570" } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("autocomplete-options-multiple"), { target: { value: "XAF" } });
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Caisse",
      code: "570",
      parent: null,
      type: ACCOUNT_TYPE.ASSET,
      isBankAccount: false,
      currencies: ["XAF"],
    });
  });

  it("submits the edited values with the current parent, account type and bank flag", () => {
    const onSubmit = vi.fn();
    renderDialog({ account: ACCOUNT, onSubmit });

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.form.save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reserves",
      code: "1200",
      parent: PARENT_ACCOUNT,
      type: ACCOUNT_TYPE.EQUITY,
      isBankAccount: true,
      currencies: ["XAF", "EUR"],
    });
  });

  it("inherits and locks the parent type when a parent account is picked", () => {
    const onSubmit = vi.fn();
    renderDialog({ account: null, currencyOptions: ["XAF"], onSubmit });

    const parentSelect = selectFor("ledger.accounts.form.parent");
    const typeSelect = selectFor("ledger.accountType");
    expect(typeSelect).toBeEnabled();

    fireEvent.change(screen.getByLabelText("ledger.accounts.form.name"), { target: { value: "Ventes clients" } });
    fireEvent.change(screen.getByLabelText("ledger.accounts.form.code"), { target: { value: "7011" } });
    fireEvent.change(parentSelect, { target: { value: "parent-uuid" } });
    fireEvent.change(screen.getByLabelText("autocomplete-options-multiple"), { target: { value: "XAF" } });

    // hordak forces a child's type to its parent's (check_account_type trigger).
    expect(typeSelect).toBeDisabled();
    expect(typeSelect.value).toBe(ACCOUNT_TYPE.INCOME);

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.create.submit" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ parent: PARENT_ACCOUNT, type: ACCOUNT_TYPE.INCOME }),
    );
  });

  it("keeps the bank account box unusable under a non-asset parent", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    const bankBox = screen.getByLabelText("ledger.accounts.form.isBankAccount");
    expect(bankBox).toBeEnabled();

    fireEvent.change(selectFor("ledger.accounts.form.parent"), { target: { value: "liability-uuid" } });

    // hordak: bank_accounts_are_asset_accounts — the parent imposes LI.
    expect(bankBox).toBeDisabled();
    expect(bankBox).not.toBeChecked();
    expect(selectFor("ledger.accountType")).toHaveValue(ACCOUNT_TYPE.LIABILITY);

    // Re-ticking it is impossible: it cannot contradict the parent's type.
    fireEvent.click(bankBox);
    expect(bankBox).not.toBeChecked();
  });

  it("caps the account code at the hordak column length", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    expect(screen.getByLabelText("ledger.accounts.form.code")).toHaveAttribute("maxLength", "6");
  });

  it("forces and locks the asset type when the account is a bank account", () => {
    renderDialog({ account: null, currencyOptions: ["XAF"] });

    fireEvent.click(screen.getByLabelText("ledger.accounts.form.isBankAccount"));

    // hordak check constraint: bank_accounts_are_asset_accounts
    const typeSelect = selectFor("ledger.accountType");
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
