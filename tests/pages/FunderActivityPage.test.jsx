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

const FUNDER_ID = btoa("AnalyticValue:GIZ");

const { captured } = vi.hoisted(() => ({ captured: { queries: [] } }));

// The backend answers `funderActivityReport(analyticValueId, accountingPeriodId)`
// with a single aggregate: one row per (funder, period) pair.
vi.mock("@openimis/fe-core", async (importOriginal) => {
  const orig = await importOriginal();
  const REPORT_BY_PERIOD = {
    1: { debitAmount: 33400, creditAmount: 33400, balanceAmount: 4700 },
    2: { debitAmount: 6100, creditAmount: 6100, balanceAmount: 4700 },
  };
  return {
    ...orig,
    graphqlWithVariables: (query, variables, types) => (dispatch) => {
      captured.queries.push(variables);
      dispatch({ type: types[0] });
      dispatch({
        type: types[1],
        payload: { data: { funderActivityReport: REPORT_BY_PERIOD[variables?.accountingPeriodId] } },
      });
    },
  };
});

vi.mock("../../src/pickers/FunderPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange?.({ analyticValueId: FUNDER_ID, displayName: "GIZ" })}>
      select-giz
    </button>
  ),
}));

vi.mock("../../src/pickers/AccountingPeriodPicker", () => ({
  default: ({ onChange }) => (
    <>
      <button type="button" onClick={() => onChange?.("1")}>
        select-period-1
      </button>
      <button type="button" onClick={() => onChange?.("2")}>
        select-period-2
      </button>
    </>
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
        accountingPeriods: {
          totalCount: 2,
          edges: [
            { node: { id: "1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" } },
            { node: { id: "2", startDate: "2026-06-01", endDate: "2026-06-30", status: "closed" } },
          ],
        },
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

const selectFunder = (user) => user.click(screen.getByText("select-giz"));

describe("FunderActivityPage", () => {
  it("renders the funder picker when the user has reporting rights", () => {
    renderPage(buildStore());

    expect(screen.getByText("select-giz")).toBeInTheDocument();
  });

  it("only queries once both the funder and the accounting period are known", async () => {
    const user = userEvent.setup();
    captured.queries = [];
    renderPage(buildStore());

    expect(captured.queries).toHaveLength(0);

    await selectFunder(user);
    expect(captured.queries).toHaveLength(0);

    // Both mutation arguments are required by the backend.
    await user.click(screen.getByText("select-period-1"));
    expect(captured.queries).toEqual([{ analyticValueId: FUNDER_ID, accountingPeriodId: "1" }]);
    expect(await screen.findByText("ledger.funderActivityPage.totalsTitle")).toBeInTheDocument();
  });

  it("renders the aggregated totals of the selected funder and period", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await selectFunder(user);
    await user.click(screen.getByText("select-period-1"));

    expect(await screen.findByText("ledger.funderActivityPage.totalsTitle")).toBeInTheDocument();
    expect(screen.getAllByText("33400").length).toBe(2); // debit + credit totals
    expect(screen.getByText("4700")).toBeInTheDocument(); // carried-forward balance
  });

  it("refetches the aggregate and updates the caption when the period changes", async () => {
    const user = userEvent.setup();
    captured.queries = [];
    const store = buildStore();
    seedPeriods(store);
    renderPage(store);

    await selectFunder(user);
    await user.click(screen.getByText("select-period-1"));
    expect(await screen.findByText(/2026-07-01 — 2026-07-31/)).toBeInTheDocument();

    // Restrict the report to the closed period (June): the aggregate changes.
    await user.click(screen.getByText("select-period-2"));

    expect(captured.queries).toEqual([
      { analyticValueId: FUNDER_ID, accountingPeriodId: "1" },
      { analyticValueId: FUNDER_ID, accountingPeriodId: "2" },
    ]);
    expect(await screen.findByText(/2026-06-01 — 2026-06-30/)).toBeInTheDocument();
    expect(screen.getAllByText("6100").length).toBe(2);
    expect(screen.getByText("4700")).toBeInTheDocument();
  });

  it("shows an access denied message without the reporting right", () => {
    renderPage(buildStore({ rights: [] }));

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
  });
});
