import React from "react";
import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { afterEach } from "vitest";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { initialState as ledgerInitialState } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../../src/constants";

import GeneralLedgerPage from "../../src/pages/GeneralLedgerPage";
import PartyLedgerPage from "../../src/pages/PartyLedgerPage";
import FunderActivityPage from "../../src/pages/FunderActivityPage";
import AccountingPeriodsPage from "../../src/pages/AccountingPeriodsPage";
import ManualReviewQueuePage from "../../src/pages/ManualReviewQueuePage";
import PeriodExportPage from "../../src/pages/PeriodExportPage";
import DeploymentConfigurationPage from "../../src/pages/DeploymentConfigurationPage";

const coreReducer = (state = { user: { i_user: { rights: [RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN] } } }) => state;

const buildStore = () =>
  createStore(combineReducers({ core: coreReducer, ledger: () => ledgerInitialState }), applyMiddleware(thunk));

const renderPage = (Page) =>
  render(
    <Provider store={buildStore()}>
      <IntlProvider locale="en">
        <Page />
      </IntlProvider>
    </Provider>,
  );

afterEach(() => {
  cleanup();
});

describe("page smoke tests", () => {
  it.each([
    ["GeneralLedgerPage", GeneralLedgerPage],
    ["PartyLedgerPage", PartyLedgerPage],
    ["FunderActivityPage", FunderActivityPage],
    ["AccountingPeriodsPage", AccountingPeriodsPage],
    ["ManualReviewQueuePage", ManualReviewQueuePage],
    ["PeriodExportPage", PeriodExportPage],
    ["DeploymentConfigurationPage", DeploymentConfigurationPage],
  ])("%s mounts without throwing", (name, Page) => {
    expect(() => renderPage(Page)).not.toThrow();
  });

  it("DeploymentConfigurationPage renders its configuration form", () => {
    const { getByLabelText } = renderPage(DeploymentConfigurationPage);
    expect(getByLabelText("ledger.deployment.operatingMode")).toBeInTheDocument();
  });
});
