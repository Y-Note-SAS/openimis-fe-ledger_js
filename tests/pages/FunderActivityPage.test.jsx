import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { initialState as ledgerInitialState } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING } from "../../src/constants";
import FunderActivityPage from "../../src/pages/FunderActivityPage";

vi.mock("../../src/pickers/FunderPicker", () => ({
  default: () => <div>FunderPicker</div>,
}));

vi.mock("../../src/pickers/AccountingPeriodPicker", () => ({
  default: ({ label }) => <div>{label}</div>,
}));

const buildStore = ({ rights = [RIGHT_LEDGER_REPORTING] } = {}) =>
  createStore(
    combineReducers({
      core: () => ({
        user: { i_user: { rights } },
      }),
      ledger: () => ledgerInitialState,
    }),
    applyMiddleware(thunk),
  );

const renderPage = (options) =>
  render(
    <Provider store={buildStore(options)}>
      <IntlProvider locale="en" messages={{}}>
        <FunderActivityPage />
      </IntlProvider>
    </Provider>,
  );

describe("FunderActivityPage", () => {
  it("renders the funder picker when the user has reporting rights", () => {
    renderPage();

    expect(screen.getByText("FunderPicker")).toBeInTheDocument();
  });

  it("renders the period range controls", () => {
    renderPage();

    expect(screen.getByText("ledger.funderActivityPage.periodStart")).toBeInTheDocument();
    expect(screen.getByText("ledger.funderActivityPage.periodEnd")).toBeInTheDocument();
  });

  it("hides the page when the user has no ledger rights", () => {
    const { container } = renderPage({ rights: [] });

    expect(container).toBeEmptyDOMElement();
  });
});
