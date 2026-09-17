import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, connect } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_ADMIN, RIGHT_LEDGER_REPORTING } from "../../src/constants";
import { JournalsPage } from "../../src/pages/JournalsPage";

const JOURNAL_TYPE = { id: "type-1", code: "bank", type: "Bank & Checks Journal", altLanguage: "Banque" };
const DEBIT_ACCOUNT = { id: "acc-1", uuid: "acc-1", code: "5120", name: "Banque" };
const CREDIT_ACCOUNT = { id: "acc-2", uuid: "acc-2", code: "7010", name: "Ventes" };
const JOURNAL = {
  id: "journal-1",
  code: "BANK",
  name: "Bank",
  type: JOURNAL_TYPE,
  defaultDebitAccountId: DEBIT_ACCOUNT,
  defaultCreditAccountId: CREDIT_ACCOUNT,
};

vi.mock("../../src/components/JournalsSearcher", () => ({
  default: ({ canManage, onCreate, onEdit, onDelete }) => (
    <div data-testid="journals-searcher">
      <span data-testid="can-manage">{String(canManage)}</span>
      <button type="button" onClick={onCreate}>
        open-create-dialog
      </button>
      <button type="button" onClick={() => onEdit(globalThis.__journal)}>
        open-edit-dialog
      </button>
      <button type="button" onClick={() => onDelete(globalThis.__journal)}>
        ask-delete
      </button>
    </div>
  ),
}));

globalThis.__journal = JOURNAL;

const ConnectedJournalsPage = connect((state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  confirmed: state.core?.confirmed,
  journalMutation: state.ledger?.journalMutation,
  mutation: state.ledger?.mutation,
  submittingMutation: state.ledger?.submittingMutation,
}))(JournalsPage);

const coreReducer =
  (rights) =>
  (state = { user: { i_user: { rights } }, confirmed: null }, action) => {
    if (action.type === "TEST_SET_CONFIRMED") return { ...state, confirmed: action.payload };
    return state;
  };

const buildStore = ({ rights = [RIGHT_LEDGER_ADMIN] } = {}) =>
  createStore(combineReducers({ core: coreReducer(rights), ledger: reducer }), applyMiddleware(thunk));

const seed = (store) => {
  store.dispatch({
    type: `${ACTION_TYPE.JOURNAL_TYPES}_RESP`,
    payload: {
      data: {
        journalTypes: { edges: [{ node: { id: btoa("JournalTypeGQLType:type-1"), ...JOURNAL_TYPE, id: "type-1" } }] },
      },
    },
  });
  store.dispatch({
    type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_RESP`,
    payload: {
      data: {
        accounts: {
          edges: [
            { node: { id: btoa("AccountType:acc-1"), uuid: "acc-1", code: "5120", name: "Banque", type: "AS" } },
            { node: { id: btoa("AccountType:acc-2"), uuid: "acc-2", code: "7010", name: "Ventes", type: "IN" } },
          ],
        },
      },
    },
  });
};

const renderPage = (store) => {
  const actions = {
    createJournal: vi.fn(),
    updateJournal: vi.fn(),
    deleteJournal: vi.fn(),
    coreConfirm: vi.fn(),
    journalize: vi.fn(),
  };
  const utils = render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <ConnectedJournalsPage {...actions} />
      </IntlProvider>
    </Provider>,
  );
  return { ...utils, actions };
};

describe("JournalsPage", () => {
  let store;

  beforeEach(() => {
    store = buildStore();
    seed(store);
  });

  it("renders the paginated list and enables management for administrators", () => {
    renderPage(store);

    expect(screen.getByTestId("journals-searcher")).toBeInTheDocument();
    expect(screen.getByTestId("can-manage")).toHaveTextContent("true");
  });

  it("denies access without the reporting right", () => {
    store = buildStore({ rights: [] });
    seed(store);
    renderPage(store);

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(screen.queryByTestId("journals-searcher")).not.toBeInTheDocument();
  });

  it("keeps the list readable but read-only for non administrators", () => {
    store = buildStore({ rights: [RIGHT_LEDGER_REPORTING] });
    seed(store);
    renderPage(store);

    expect(screen.getByTestId("can-manage")).toHaveTextContent("false");
  });

  it("edits a journal with its uuid and closes the dialog on success", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-edit-dialog" }));
    expect(screen.getByLabelText("ledger.journals.form.name")).toHaveValue("Bank");

    fireEvent.click(screen.getByRole("button", { name: "ledger.journals.form.save" }));

    expect(actions.updateJournal).toHaveBeenCalledWith({
      journalUuid: "journal-1",
      name: "Bank",
      code: "BANK",
      journalType: JOURNAL_TYPE,
      defaultDebitAccount: DEBIT_ACCOUNT,
      defaultCreditAccount: CREDIT_ACCOUNT,
      clientMutationLabel: "ledger.journals.edit.mutationLabel",
    });

    store.dispatch({ type: `${ACTION_TYPE.UPDATE_JOURNAL}_RESP`, payload: { data: { updateJournal: {} } } });

    await waitFor(() => expect(screen.queryByLabelText("ledger.journals.form.name")).not.toBeInTheDocument());
  });

  it("asks for confirmation then deletes the journal with its uuid only", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "ask-delete" }));

    expect(actions.coreConfirm).toHaveBeenCalledWith(
      "ledger.journals.delete.confirmTitle",
      "ledger.journals.delete.confirmMessage",
    );
    expect(actions.deleteJournal).not.toHaveBeenCalled();

    store.dispatch({ type: "TEST_SET_CONFIRMED", payload: true });

    await waitFor(() =>
      expect(actions.deleteJournal).toHaveBeenCalledWith({
        journalUuid: "journal-1",
        clientMutationLabel: "ledger.journals.delete.mutationLabel",
      }),
    );
  });

  it("journalizes the mutation for the core mutation drawer after a success", async () => {
    const { actions } = renderPage(store);

    store.dispatch({
      type: `${ACTION_TYPE.CREATE_JOURNAL}_REQ`,
      meta: { clientMutationId: "cid-1", clientMutationLabel: "Create journal", requestedDateTime: new Date() },
    });
    await waitFor(() => expect(store.getState().ledger.submittingMutation).toBe(true));
    store.dispatch({
      type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`,
      payload: { data: { createJournal: { internalId: "internal-1" } } },
    });

    await waitFor(() =>
      expect(actions.journalize).toHaveBeenCalledWith(
        expect.objectContaining({ clientMutationId: "cid-1", clientMutationLabel: "Create journal", id: "internal-1" }),
      ),
    );
  });

  it("shows the backend rejection inside the dialog", () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-create-dialog" }));
    store.dispatch({
      type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`,
      payload: {
        data: { createJournal: { errors: [{ field: "type", message: "The specified journal type was not found" }] } },
      },
    });

    return waitFor(() => expect(screen.getByText(/The specified journal type was not found/)).toBeInTheDocument());
  });
});
