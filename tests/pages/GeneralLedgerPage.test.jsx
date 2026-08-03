import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { clearCurrentPaginationPage } from "@openimis/fe-core";
import { initialState as ledgerInitialState } from "../../src/reducer";
import { MODULE_NAME, RIGHT_LEDGER_REPORTING } from "../../src/constants";
import GeneralLedgerPage from "../../src/pages/GeneralLedgerPage";

vi.mock("../../src/components/LedgerEntrySearcher", () => ({
  default: () => <div>LedgerEntrySearcher</div>,
}));

const buildStore = ({ rights = [RIGHT_LEDGER_REPORTING], module } = {}) =>
  createStore(
    combineReducers({
      core: () => ({
        user: { i_user: { rights } },
        savedPagination: { module },
      }),
      ledger: () => ledgerInitialState,
    }),
    applyMiddleware(thunk),
  );

const renderPage = (options) =>
  render(
    <Provider store={buildStore(options)}>
      <IntlProvider locale="en" messages={{}}>
        <GeneralLedgerPage />
      </IntlProvider>
    </Provider>,
  );

describe("GeneralLedgerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the ledger searcher when the user has reporting rights", () => {
    renderPage();

    expect(screen.getByText("LedgerEntrySearcher")).toBeInTheDocument();
  });

  it("hides the page when the user has no ledger rights", () => {
    const { container } = renderPage({ rights: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it("clears saved pagination when opening the page from another module", () => {
    renderPage({ module: "claim" });

    expect(clearCurrentPaginationPage).toHaveBeenCalledTimes(1);
  });

  it("keeps saved pagination when reopening inside the ledger module", () => {
    renderPage({ module: MODULE_NAME });

    expect(clearCurrentPaginationPage).not.toHaveBeenCalled();
  });
});
