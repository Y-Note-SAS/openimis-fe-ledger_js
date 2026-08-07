import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING } from "../../src/constants";
import FunderActivityPage from "../../src/pages/FunderActivityPage";

vi.mock("../../src/pickers/FunderPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange?.({ analyticValueId: btoa("AnalyticValue:GIZ"), displayName: "GIZ" })}>
      select-giz
    </button>
  ),
}));

vi.mock("../../src/pickers/AccountingPeriodPicker", () => ({
  default: ({ label, onChange }) => (
    <button type="button" onClick={() => onChange?.(label === "ledger.funderActivityPage.periodStart" ? "1" : "2")}>
      {label}
    </button>
  ),
}));

const buildStore = ({ rights = [RIGHT_LEDGER_REPORTING] } = {}) =>
  createStore(
    combineReducers({
      core: () => ({ user: { i_user: { rights } } }),
      ledger: reducer,
    }),
    applyMiddleware(thunk),
  );

// Periods with the DECODED ids the pickers hand out in the real app
// (July = "1", June = "2"), so the caption can resolve their labels.
const seedPeriods = (store) =>
  store.dispatch({
    type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
    payload: {
      data: {
        accountingPeriods: [
          { id: "1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" },
          { id: "2", startDate: "2026-06-01", endDate: "2026-06-30", status: "closed" },
        ],
      },
    },
  });

const renderPage = (store) =>
  render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <FunderActivityPage />
      </IntlProvider>
    </Provider>,
  );

describe("FunderActivityPage", () => {
  it("renders the funder picker when the user has reporting rights", () => {
    renderPage(buildStore());

    expect(screen.getByText("select-giz")).toBeInTheDocument();
  });

  it("renders the period range controls", () => {
    renderPage(buildStore());

    expect(screen.getByText("ledger.funderActivityPage.periodStart")).toBeInTheDocument();
    expect(screen.getByText("ledger.funderActivityPage.periodEnd")).toBeInTheDocument();
  });

  it("renders aggregated totals and the category breakdown for the selected funder", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await user.click(screen.getByText("select-giz"));

    expect(await screen.findByText("claim_payment")).toBeInTheDocument();
    expect(screen.getAllByText("33400").length).toBe(2); // debit + credit totals
    expect(screen.getByText("4700")).toBeInTheDocument(); // carried-forward balance
    expect(screen.getAllByText("18600").length).toBe(2); // claim_payment debit + credit
    expect(screen.getByText("payment_point_reconciliation")).toBeInTheDocument();
    expect(screen.getAllByText("800").length).toBe(2);
  });

  it("displays the covered dates in the range caption", async () => {
    const user = userEvent.setup();
    const store = buildStore();
    seedPeriods(store);
    renderPage(store);

    await user.click(screen.getByText("select-giz"));
    await screen.findByText("claim_payment");

    // End only: the report covers June.
    await user.click(screen.getByText("ledger.funderActivityPage.periodEnd"));
    expect(await screen.findByText(/2026-06-01 — 2026-06-30/)).toBeInTheDocument();

    // Both bounds (July start / June end): the caption is normalised to the
    // covered chronological span, matching the inclusive range of the report.
    await user.click(screen.getByText("ledger.funderActivityPage.periodStart"));
    expect(screen.getByText(/2026-06-01 — 2026-07-31/)).toBeInTheDocument();
  });

  it("refetches the report when the period range changes", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await user.click(screen.getByText("select-giz"));
    await screen.findByText("claim_payment");

    // Restrict the range to the closed period (June) and check the data changes.
    await user.click(screen.getByText("ledger.funderActivityPage.periodEnd"));

    expect((await screen.findAllByText("6100")).length).toBe(4); // totals + single category row
    expect(screen.queryByText("18600")).not.toBeInTheDocument();
    expect(screen.queryByText("payment_point_reconciliation")).not.toBeInTheDocument();
    expect(screen.getByText("4700")).toBeInTheDocument();
  });

  it("returns null without the reporting right", () => {
    const store = buildStore({ rights: [] });
    const { container } = renderPage(store);

    expect(container).toBeEmptyDOMElement();
  });
});
