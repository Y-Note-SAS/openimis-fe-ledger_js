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
import { AccountsPage } from "../../src/pages/AccountsPage";

const ACCOUNT = {
  id: "uuid-1",
  uuid: "uuid-1",
  code: "1200",
  name: "Reserves",
  fullCode: "1200",
  type: "EQ",
  isBankAccount: false,
  currencies: ["XAF"],
};

const accountRef = vi.hoisted(() => ({ current: null }));
const searcherAccount = () => accountRef.current;

vi.mock("../../src/components/AccountsSearcher", () => ({
  default: ({ canManage, onCreate, onEdit, onDelete }) => (
    <div data-testid="accounts-searcher">
      <span data-testid="can-manage">{String(canManage)}</span>
      <button type="button" onClick={onCreate}>
        open-create-dialog
      </button>
      <button type="button" onClick={() => onEdit(searcherAccount())}>
        open-edit-dialog
      </button>
      <button type="button" onClick={() => onDelete(searcherAccount())}>
        ask-delete
      </button>
    </div>
  ),
}));

// Module-scoped (not globalThis) so the mock cannot leak into another test file;
// `searcherAccount` is a hoisted getter because the mock factory is hoisted too.

// The named export is the unconnected component: wire it to the store the way
// the module does so the mutation state is read from Redux.
const ConnectedAccountsPage = connect((state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  confirmed: state.core?.confirmed,
  accountMutation: state.ledger?.accountMutation,
  mutation: state.ledger?.mutation,
  submittingMutation: state.ledger?.submittingMutation,
  accountOptions: state.ledger?.accountOptions,
  deploymentConfiguration: state.ledger?.deploymentConfiguration,
}))(AccountsPage);

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
    type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
    payload: {
      data: {
        deploymentConfiguration: {
          edges: [
            {
              node: {
                id: "config-1",
                operatingMode: "LOCAL_ONLY",
                externalSystem: null,
                currencyCode: "XAF",
                retainedEarningsAccount: null,
              },
            },
          ],
        },
      },
    },
  });
  store.dispatch({
    type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_RESP`,
    payload: {
      data: {
        accounts: {
          edges: [
            {
              node: {
                id: btoa("AccountType:uuid-1"),
                uuid: "uuid-1",
                code: "1200",
                name: "Reserves",
                type: "EQ",
                currencies: '["XAF","EUR"]',
              },
            },
          ],
        },
      },
    },
  });
};

const renderPage = (store) => {
  const actions = {
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    coreConfirm: vi.fn(),
    journalize: vi.fn(),
    fetchAccountOptions: vi.fn(),
    fetchLedgerDeploymentConfiguration: vi.fn(),
  };
  const utils = render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <ConnectedAccountsPage {...actions} />
      </IntlProvider>
    </Provider>,
  );
  return { ...utils, actions };
};

const fillDialog = async () => {
  await userEvent.type(screen.getByLabelText("ledger.accounts.form.name"), "Caisse");
  await userEvent.type(screen.getByLabelText("ledger.accounts.form.code"), "570");
  await userEvent.selectOptions(screen.getByLabelText("autocomplete-options-multiple"), "XAF");
};

describe("AccountsPage", () => {
  let store;

  beforeEach(() => {
    accountRef.current = ACCOUNT;
    store = buildStore();
    seed(store);
  });

  it("renders the paginated list and enables management for administrators", () => {
    renderPage(store);

    expect(screen.getByTestId("accounts-searcher")).toBeInTheDocument();
    expect(screen.getByTestId("can-manage")).toHaveTextContent("true");
  });

  it("denies access without the reporting right", () => {
    store = buildStore({ rights: [] });
    seed(store);
    renderPage(store);

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(screen.queryByTestId("accounts-searcher")).not.toBeInTheDocument();
  });

  it("keeps the list readable but read-only for non administrators", () => {
    store = buildStore({ rights: [RIGHT_LEDGER_REPORTING] });
    seed(store);
    renderPage(store);

    expect(screen.getByTestId("can-manage")).toHaveTextContent("false");
  });

  it("creates an account from the dialog", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-create-dialog" }));
    await fillDialog();
    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.create.submit" }));

    expect(actions.createAccount).toHaveBeenCalledWith({
      name: "Caisse",
      code: "570",
      parentId: null,
      type: "AS",
      isBankAccount: false,
      currencies: ["XAF"],
      clientMutationLabel: "ledger.accounts.create.mutationLabel",
    });
  });

  it("creates a sub-account with the picked parent uuid", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-create-dialog" }));
    await fillDialog();
    // The chart of accounts (seed) offers "1200 - Reserves" as a parent.
    await userEvent.selectOptions(screen.getAllByLabelText("autocomplete-options")[0], "uuid-1");
    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.create.submit" }));

    expect(actions.createAccount).toHaveBeenCalledWith(expect.objectContaining({ parentId: "uuid-1", type: "EQ" }));
  });

  it("edits an account with its uuid and closes the dialog on success", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-edit-dialog" }));
    expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue("Reserves");

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.form.save" }));

    expect(actions.updateAccount).toHaveBeenCalledWith({
      accountUuid: "uuid-1",
      name: "Reserves",
      code: "1200",
      parentId: null,
      type: "EQ",
      isBankAccount: false,
      currencies: ["XAF"],
      clientMutationLabel: "ledger.accounts.edit.mutationLabel",
    });

    // `_RESP` alone is not a success: the dialog only closes once the mutation
    // log confirms the write.
    store.dispatch({ type: `${ACTION_TYPE.UPDATE_ACCOUNT}_RESP`, payload: { data: { updateAccount: {} } } });
    expect(screen.getByLabelText("ledger.accounts.form.name")).toBeInTheDocument();

    store.dispatch({ type: `${ACTION_TYPE.UPDATE_ACCOUNT}_CONFIRMED` });

    await waitFor(() => expect(screen.queryByLabelText("ledger.accounts.form.name")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and shows the rejection when the mutation log reports a failure", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-edit-dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.form.save" }));

    store.dispatch({ type: `${ACTION_TYPE.UPDATE_ACCOUNT}_RESP`, payload: { data: { updateAccount: {} } } });
    store.dispatch({
      type: `${ACTION_TYPE.UPDATE_ACCOUNT}_ERR`,
      payload: {
        status: 400,
        statusText: "The account you are trying to delete has childrens",
        message: "The account you are trying to delete has childrens",
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/The account you are trying to delete has childrens/)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("ledger.accounts.form.name")).toBeInTheDocument();
  });

  it("refuses to delete an account that still has sub-accounts", () => {
    accountRef.current = { ...ACCOUNT, children: { totalCount: 1 } };
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "ask-delete" }));

    expect(actions.coreConfirm).not.toHaveBeenCalled();
    expect(actions.deleteAccount).not.toHaveBeenCalled();
  });

  it("asks for confirmation then deletes the account with its uuid only", async () => {
    const { actions } = renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "ask-delete" }));

    expect(actions.coreConfirm).toHaveBeenCalledWith(
      "ledger.accounts.delete.confirmTitle",
      "ledger.accounts.delete.confirmMessage",
    );
    expect(actions.deleteAccount).not.toHaveBeenCalled();

    store.dispatch({ type: "TEST_SET_CONFIRMED", payload: true });

    await waitFor(() =>
      expect(actions.deleteAccount).toHaveBeenCalledWith({
        accountUuid: "uuid-1",
        clientMutationLabel: "ledger.accounts.delete.mutationLabel",
      }),
    );
  });

  it("journalizes the mutation for the core mutation drawer after a success", async () => {
    const { actions } = renderPage(store);

    store.dispatch({
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_REQ`,
      meta: { clientMutationId: "cid-1", clientMutationLabel: "Create account", requestedDateTime: new Date() },
    });
    await waitFor(() => expect(store.getState().ledger.submittingMutation).toBe(true));
    store.dispatch({
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`,
      payload: { data: { createAccount: { internalId: "internal-1" } } },
    });

    await waitFor(() =>
      expect(actions.journalize).toHaveBeenCalledWith(
        expect.objectContaining({ clientMutationId: "cid-1", clientMutationLabel: "Create account", id: "internal-1" }),
      ),
    );
  });

  it("shows the backend rejection inside the dialog", () => {
    store.dispatch({
      type: `${ACTION_TYPE.DELETE_ACCOUNT}_RESP`,
      payload: {
        data: { deleteAccount: { errors: [{ field: "accountUuid", message: "Account is used by 12 legs" }] } },
      },
    });
    renderPage(store);

    fireEvent.click(screen.getByRole("button", { name: "open-edit-dialog" }));

    expect(screen.getByText(/Account is used by 12 legs/)).toBeInTheDocument();
  });
});
