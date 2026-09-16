import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import JournalFormDialog from "../../src/dialogs/JournalFormDialog";

vi.mock("../../src/actions", () => ({
  fetchJournalTypes: vi.fn(() => () => {}),
  fetchAccountOptions: vi.fn(() => () => {}),
}));

const JOURNAL_TYPE = { id: "type-1", code: "bank", type: "Bank & Checks Journal", altLanguage: "Banque" };
const DEBIT_ACCOUNT = { id: "acc-1", uuid: "acc-1", code: "5120", name: "Banque" };
const CREDIT_ACCOUNT = { id: "acc-2", uuid: "acc-2", code: "7010", name: "Ventes" };

const ACCOUNT = {
  id: "journal-1",
  name: "Bank",
  code: "BANK",
  type: JOURNAL_TYPE,
  defaultDebitAccountId: DEBIT_ACCOUNT,
  defaultCreditAccountId: CREDIT_ACCOUNT,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const buildStore = () =>
  createStore(
    combineReducers({
      ledger: (
        state = {
          journalTypes: { items: [JOURNAL_TYPE], isFetching: false, isFetched: true, error: null },
          accountOptions: { items: [DEBIT_ACCOUNT, CREDIT_ACCOUNT], isFetching: false, isFetched: true, error: null },
        },
      ) => state,
    }),
    applyMiddleware(thunk),
  );

const renderDialog = (props = {}) =>
  render(
    <Provider store={buildStore()}>
      <IntlProvider locale="en" messages={{}}>
        <JournalFormDialog open onClose={vi.fn()} onSubmit={vi.fn()} {...props} />
      </IntlProvider>
    </Provider>,
  );

describe("JournalFormDialog", () => {
  it("renders the creation form", () => {
    renderDialog({ journal: null });

    expect(screen.getByText("ledger.journals.form.createTitle")).toBeInTheDocument();
    // The title band is styled on the DialogTitle itself (portal-safe).
    expect(screen.getByText("ledger.journals.form.createTitle").closest("h2")).toHaveAttribute(
      "id",
      "ledger-journal-form-title",
    );
    expect(screen.getByLabelText("ledger.journals.form.name")).toHaveValue("");
  });

  it("prefills the journal, its type and both default accounts when editing", () => {
    renderDialog({ journal: ACCOUNT });

    expect(screen.getByText("ledger.journals.form.editTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.journals.form.name")).toHaveValue("Bank");
    expect(screen.getByLabelText("ledger.journals.form.code")).toHaveValue("BANK");
    expect(screen.getByLabelText("ledger.picker.journalType").value).toBe("Banque");
  });

  it("keeps the save button disabled until every required field is filled", () => {
    const onSubmit = vi.fn();
    renderDialog({ journal: null, onSubmit });

    const save = screen.getByRole("button", { name: "ledger.journals.create.submit" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ledger.journals.form.name"), { target: { value: "Cash" } });
    fireEvent.change(screen.getByLabelText("ledger.journals.form.code"), { target: { value: "CASH" } });
    expect(save).toBeDisabled();

    // [0] journal type, [1] default debit account, [2] default credit account.
    const [typeSelect, debitSelect, creditSelect] = screen.getAllByLabelText("autocomplete-options");
    fireEvent.change(debitSelect, { target: { value: "acc-1" } });
    fireEvent.change(creditSelect, { target: { value: "acc-2" } });
    expect(save).toBeDisabled();

    fireEvent.change(typeSelect, { target: { value: "bank" } });
    expect(save).toBeEnabled();

    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Cash",
      code: "CASH",
      journalType: JOURNAL_TYPE,
      defaultDebitAccount: DEBIT_ACCOUNT,
      defaultCreditAccount: CREDIT_ACCOUNT,
    });
  });

  it("submits the edited values", () => {
    const onSubmit = vi.fn();
    renderDialog({ journal: ACCOUNT, onSubmit });

    fireEvent.click(screen.getByRole("button", { name: "ledger.journals.form.save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Bank",
      code: "BANK",
      journalType: JOURNAL_TYPE,
      defaultDebitAccount: DEBIT_ACCOUNT,
      defaultCreditAccount: CREDIT_ACCOUNT,
    });
  });

  it("shows the backend rejection inside the dialog", () => {
    renderDialog({ journal: ACCOUNT, error: "The specified journal type was not found" });

    expect(screen.getByText(/The specified journal type was not found/)).toBeInTheDocument();
  });
});
