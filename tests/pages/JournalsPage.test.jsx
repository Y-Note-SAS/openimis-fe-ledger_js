import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, connect } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_ADMIN, RIGHT_LEDGER_REPORTING } from "../../src/constants";
import { JournalsPage } from "../../src/pages/JournalsPage";

vi.mock("../../src/components/JournalsSearcher", () => ({
  default: () => <div data-testid="journals-searcher">searcher</div>,
}));

vi.mock("../../src/pickers/JournalTypePicker", () => ({
  default: ({ label, onChange, value }) => (
    <div>
      <span>{label || "ledger.picker.journalType"}</span>
      <span data-testid="journal-type-value">{value?.id || ""}</span>
      <button type="button" onClick={() => onChange?.({ id: "uuid-2", code: "bank", type: "Bank & Checks Journal" })}>
        select-journal-type
      </button>
    </div>
  ),
}));

vi.mock("../../src/pickers/AccountPicker", () => ({
  default: ({ label, onChange }) => (
    <button
      type="button"
      onClick={() =>
        onChange?.({
          id: `account-${label}`,
          uuid: label === "ledger.journals.form.defaultDebitAccount" ? "debit-uuid" : "credit-uuid",
          code: "5120",
          name: "Banque",
        })
      }
    >
      {label}
    </button>
  ),
}));

const ConnectedJournalsPage = connect((state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  journalMutation: state.ledger?.journalMutation,
}))(JournalsPage);

const buildStore = ({ rights = [RIGHT_LEDGER_ADMIN] } = {}) =>
  createStore(
    combineReducers({
      core: () => ({ user: { i_user: { rights } } }),
      ledger: reducer,
    }),
    applyMiddleware(thunk),
  );

const renderPage = (store) => {
  const actions = { createJournal: vi.fn() };
  const utils = render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <ConnectedJournalsPage {...actions} />
      </IntlProvider>
    </Provider>,
  );
  return { ...utils, actions };
};

const fillForm = async () => {
  await userEvent.type(screen.getByLabelText("ledger.journals.form.name"), "Bank");
  await userEvent.type(screen.getByLabelText("ledger.journals.form.code"), "BANK");
  fireEvent.click(screen.getByRole("button", { name: "select-journal-type" }));
  fireEvent.click(screen.getByRole("button", { name: "ledger.journals.form.defaultDebitAccount" }));
  fireEvent.click(screen.getByRole("button", { name: "ledger.journals.form.defaultCreditAccount" }));
};

describe("JournalsPage", () => {
  let store;

  beforeEach(() => {
    store = buildStore();
  });

  it("renders the creation form and the paginated searcher for ledger administrators", () => {
    renderPage(store);

    expect(screen.getByLabelText("ledger.journals.form.name")).toBeInTheDocument();
    expect(screen.getByTestId("journals-searcher")).toBeInTheDocument();
    expect(screen.getByText("ledger.picker.journalType")).toBeInTheDocument();
  });

  it("keeps a stable hook order when the rights arrive after the first render", () => {
    const actions = { createJournal: vi.fn() };
    const page = (rights) => (
      <IntlProvider locale="en" messages={{}}>
        <JournalsPage rights={rights} {...actions} />
      </IntlProvider>
    );

    // First render without the reporting right (core user still loading), then
    // with it: the hook count must not change (no "Rendered fewer hooks than
    // expected").
    const { rerender } = render(page([]));
    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();

    rerender(page([RIGHT_LEDGER_REPORTING]));

    expect(screen.queryByText("ledger.accessDenied")).not.toBeInTheDocument();
    expect(screen.getByTestId("journals-searcher")).toBeInTheDocument();
  });

  it("denies access without the reporting right", () => {
    store = buildStore({ rights: [] });
    renderPage(store);

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(screen.queryByTestId("journals-searcher")).not.toBeInTheDocument();
  });

  it("shows an admin-only notice without the administrator right", () => {
    store = buildStore({ rights: [RIGHT_LEDGER_REPORTING] });
    renderPage(store);

    expect(screen.getByText("ledger.journals.adminOnlyNotice")).toBeInTheDocument();
  });

  it("keeps the submit button disabled until every required field is filled", async () => {
    const { actions } = renderPage(store);

    const submit = screen.getByRole("button", { name: "ledger.journals.create.submit" });
    expect(submit).toBeDisabled();

    await fillForm();
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    expect(actions.createJournal).toHaveBeenCalledWith({
      name: "Bank",
      code: "BANK",
      journalType: expect.objectContaining({ id: "uuid-2" }),
      defaultDebitAccount: expect.objectContaining({ uuid: "debit-uuid" }),
      defaultCreditAccount: expect.objectContaining({ uuid: "credit-uuid" }),
      clientMutationLabel: "ledger.journals.create.mutationLabel",
    });
  });

  it("does not send a sequence with the journal creation", async () => {
    const { actions } = renderPage(store);

    await fillForm();
    fireEvent.click(screen.getByRole("button", { name: "ledger.journals.create.submit" }));

    expect(actions.createJournal.mock.calls[0][0]).not.toHaveProperty("sequenceId");
  });

  it("shows the backend rejection message", () => {
    store.dispatch({
      type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`,
      payload: { data: { createJournal: { errors: [{ field: "code", message: "The code is already used" }] } } },
    });
    renderPage(store);

    expect(screen.getByText("The code is already used", { exact: false })).toBeInTheDocument();
  });

  it("clears the form and refreshes the list after a successful creation", async () => {
    renderPage(store);

    await fillForm();
    store.dispatch({ type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`, payload: { data: { createJournal: {} } } });

    await waitFor(() => expect(screen.getByLabelText("ledger.journals.form.name")).toHaveValue(""));
    expect(screen.getByTestId("journal-type-value")).toHaveTextContent("");
  });
});
