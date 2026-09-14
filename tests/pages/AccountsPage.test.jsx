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

vi.mock("../../src/components/AccountsSearcher", () => ({
  default: () => <div data-testid="accounts-searcher">searcher</div>,
}));

// The named export is the unconnected component: wire it to the store the way
// the module does so the mutation/list state is read from Redux.
const ConnectedAccountsPage = connect((state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  accountMutation: state.ledger?.accountMutation,
  accountOptions: state.ledger?.accountOptions,
  deploymentConfiguration: state.ledger?.deploymentConfiguration,
}))(AccountsPage);

const buildStore = ({ rights = [RIGHT_LEDGER_ADMIN] } = {}) =>
  createStore(
    combineReducers({
      core: () => ({ user: { i_user: { rights } } }),
      ledger: reducer,
    }),
    applyMiddleware(thunk),
  );

const seed = (store, { currency = "XAF", currencies = ['["XAF","EUR"]'] } = {}) => {
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
                currencyCode: currency,
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
                currencies: currencies[0],
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

describe("AccountsPage", () => {
  let store;

  beforeEach(() => {
    store = buildStore();
    seed(store);
  });

  it("renders the creation form and the paginated searcher for ledger administrators", () => {
    renderPage(store);

    expect(screen.getByLabelText("ledger.accounts.form.name")).toBeInTheDocument();
    expect(screen.getByLabelText("ledger.accountType")).toBeInTheDocument();
    expect(screen.getByTestId("accounts-searcher")).toBeInTheDocument();
  });

  it("loads the reference data once the reporting right is available", () => {
    const actions = {
      createAccount: vi.fn(),
      fetchAccountOptions: vi.fn(),
      fetchLedgerDeploymentConfiguration: vi.fn(),
    };
    const page = (rights) => (
      <IntlProvider locale="en" messages={{}}>
        <AccountsPage rights={rights} {...actions} />
      </IntlProvider>
    );

    // `rights` is empty on the first render (core user still loading): nothing
    // must be fetched, and the page must not crash on the hook order.
    const { rerender } = render(page([]));
    expect(actions.fetchAccountOptions).not.toHaveBeenCalled();
    expect(actions.fetchLedgerDeploymentConfiguration).not.toHaveBeenCalled();

    rerender(page([RIGHT_LEDGER_REPORTING]));

    expect(actions.fetchAccountOptions).toHaveBeenCalledTimes(1);
    expect(actions.fetchLedgerDeploymentConfiguration).toHaveBeenCalledTimes(1);
  });

  it("denies access without the reporting right", () => {
    store = buildStore({ rights: [] });
    seed(store);
    renderPage(store, { rights: [] });

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(screen.queryByTestId("accounts-searcher")).not.toBeInTheDocument();
  });

  it("keeps the submit button disabled until every required field is filled", async () => {
    const { actions } = renderPage(store);

    const submit = screen.getByRole("button", { name: "ledger.accounts.create.submit" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("ledger.accounts.form.name"), "Cash desk");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.code"), "570");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.fullCode"), "570");
    expect(submit).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("autocomplete-options-multiple"), "XAF");
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    expect(actions.createAccount).toHaveBeenCalledWith({
      name: "Cash desk",
      code: "570",
      fullCode: "570",
      type: "AS",
      isBankAccount: false,
      currencies: ["XAF"],
      clientMutationLabel: "ledger.accounts.create.mutationLabel",
    });
  });

  it("sends the bank account flag when checked", async () => {
    const { actions } = renderPage(store);

    await userEvent.type(screen.getByLabelText("ledger.accounts.form.name"), "Bank");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.code"), "5120");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.fullCode"), "5120");
    await userEvent.selectOptions(screen.getByLabelText("autocomplete-options-multiple"), "XAF");
    await userEvent.click(screen.getByLabelText("ledger.accounts.form.isBankAccount"));

    fireEvent.click(screen.getByRole("button", { name: "ledger.accounts.create.submit" }));

    expect(actions.createAccount).toHaveBeenCalledWith(expect.objectContaining({ isBankAccount: true }));
  });

  it("shows the backend rejection message", () => {
    store.dispatch({
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`,
      payload: { data: { createAccount: { errors: [{ field: "code", message: "The code is already used" }] } } },
    });
    renderPage(store);

    expect(screen.getByText("The code is already used", { exact: false })).toBeInTheDocument();
  });

  it("shows an admin-only notice without the administrator right", () => {
    store = buildStore({ rights: [158001] });
    seed(store);
    renderPage(store, { rights: [158001] });

    expect(screen.getByText("ledger.accounts.adminOnlyNotice")).toBeInTheDocument();
  });

  it("clears the form and refreshes the list after a successful creation", async () => {
    renderPage(store);

    await userEvent.type(screen.getByLabelText("ledger.accounts.form.name"), "Cash desk");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.code"), "570");
    await userEvent.type(screen.getByLabelText("ledger.accounts.form.fullCode"), "570");
    await userEvent.selectOptions(screen.getByLabelText("autocomplete-options-multiple"), "XAF");

    store.dispatch({ type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`, payload: { data: { createAccount: {} } } });

    await waitFor(() => expect(screen.getByLabelText("ledger.accounts.form.name")).toHaveValue(""));
  });
});
