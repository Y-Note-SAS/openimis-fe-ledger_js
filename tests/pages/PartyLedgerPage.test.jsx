import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING } from "../../src/constants";
import PartyLedgerPage from "../../src/pages/PartyLedgerPage";

const coreReducer = (state = { user: { i_user: { rights: [RIGHT_LEDGER_REPORTING] } } }) => state;

const buildStore = () => createStore(combineReducers({ core: coreReducer, ledger: reducer }), applyMiddleware(thunk));

// One balance row per accounting period, exactly like the `partyLedgerBalance`
// Relay connection the backend returns for one analytic value.
const seedPartyLedgerBalance = (store, nodes) =>
  store.dispatch({
    type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
    payload: {
      data: {
        partyLedgerBalance: {
          totalCount: nodes.length,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
          edges: nodes.map((node) => ({ node })),
        },
      },
    },
  });

const renderPage = (store, messages = {}) =>
  render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={messages}>
        <PartyLedgerPage />
      </IntlProvider>
    </Provider>,
  );

describe("PartyLedgerPage", () => {
  it("renders the period statement when the store holds a party ledger balance", async () => {
    const store = buildStore();
    seedPartyLedgerBalance(store, [
      {
        id: "balance-1",
        accountingPeriod: { id: "1", code: "2026-07", name: "July" },
        analyticValue: { id: btoa("AnalyticValue:HF-1"), displayName: "District Hospital" },
        debitAmount: 12500,
        creditAmount: 12500,
        balanceAmount: 12000,
      },
    ]);

    renderPage(store);

    expect(screen.getByText("2026-07")).toBeInTheDocument();
    expect(screen.getAllByText("12500").length).toBe(2); // debit + credit
    expect(screen.getByText("12000")).toBeInTheDocument(); // carried-forward balance
  });

  it("shows the empty state for a period without any movement", async () => {
    const store = buildStore();
    seedPartyLedgerBalance(store, []);

    renderPage(store);

    expect(screen.getByText("ledger.partyLedgerPage.emptyState")).toBeInTheDocument();
  });

  it("shows an access denied message without the reporting right", () => {
    const store = createStore(
      combineReducers({
        core: () => ({ user: { i_user: { rights: [] } } }),
        ledger: reducer,
      }),
      applyMiddleware(thunk),
    );

    renderPage(store);
    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
  });
});
