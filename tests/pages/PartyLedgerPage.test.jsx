import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer from "../../src/reducer";
import { fetchPartyLedgerBalanceMock } from "../../src/actions";
import { RIGHT_LEDGER_REPORTING } from "../../src/constants";
import PartyLedgerPage from "../../src/pages/PartyLedgerPage";

const coreReducer = (state = { user: { i_user: { rights: [RIGHT_LEDGER_REPORTING] } } }) => state;

const buildStore = () => createStore(combineReducers({ core: coreReducer, ledger: reducer }), applyMiddleware(thunk));

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
    // period id is the DECODED id the picker sends (the reducer decodes ids)
    await store.dispatch(fetchPartyLedgerBalanceMock(btoa("AnalyticValue:HF-1"), "1"));

    renderPage(store);

    expect(screen.getAllByText("BANK").length).toBe(2);
    expect(screen.getAllByText("12500").length).toBe(2);
    expect(screen.getByText("2026-07-24")).toBeInTheDocument();
  });

  it("shows the empty state with the carried-forward balance for an empty period", async () => {
    const store = buildStore();
    await store.dispatch(fetchPartyLedgerBalanceMock(btoa("AnalyticValue:FAM-1"), "2"));

    renderPage(store);

    expect(screen.getByText("ledger.partyLedgerPage.emptyState")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
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
