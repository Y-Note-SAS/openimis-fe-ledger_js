import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { resetAccountingPeriodsMock } from "../../src/actions";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../../src/constants";
import AccountingPeriodsPage from "../../src/pages/AccountingPeriodsPage";

vi.mock("@openimis/fe-core", async (importOriginal) => {
  const orig = await importOriginal();
  const enc = (s) => btoa(s);
  let periods = [
    { id: enc("AccountingPeriod:1"), startDate: "2026-07-01", endDate: "2026-07-31", status: "open", name: "July", code: "2026-07" },
    { id: enc("AccountingPeriod:2"), startDate: "2026-06-01", endDate: "2026-06-30", status: "closed", name: "June", code: "2026-06" },
  ];
  const byStatus = (status) => (status ? periods.filter((p) => p.status === status) : periods);
  const findP = (id) => periods.find((p) => p.id === id);
  return {
    ...orig,
    graphqlWithVariables: (query, variables, types) => (dispatch) => {
      dispatch({ type: types[0] });
      const q = String(query);
      let data;
      if (q.includes("accountingPeriods(")) {
        data = { accountingPeriods: byStatus(variables?.status) };
      } else if (q.includes("lockAccountingPeriod")) {
        const p = findP(variables?.accountingPeriodId);
        if (p) p.status = "locked";
        data = { lockAccountingPeriod: { accountingPeriod: p, errors: [] } };
      } else if (q.includes("closeAccountingPeriod")) {
        const p = findP(variables?.accountingPeriodId);
        if (p) p.status = "closed";
        data = { closeAccountingPeriod: { accountingPeriod: p, errors: [] } };
      } else if (q.includes("reopenAccountingPeriod")) {
        const p = findP(variables?.accountingPeriodId);
        if (p) p.status = "open";
        data = { reopenAccountingPeriod: { accountingPeriod: p, errors: [] } };
      } else if (q.includes("openAccountingPeriod")) {
        const openP = periods.find((p) => p.status === "open");
        if (openP) {
          data = { openAccountingPeriod: { accountingPeriod: null, errors: [{ field: "startDate", message: `Cannot open a new period while ${openP.startDate} — ${openP.endDate} is still open` }] } };
        } else {
          const np = { id: enc("AccountingPeriod:3"), startDate: variables?.startDate, endDate: variables?.endDate, status: "open", name: "Aug", code: "2026-08" };
          periods.push(np);
          data = { openAccountingPeriod: { accountingPeriod: np, errors: [] } };
        }
      }
      dispatch({ type: types[1], payload: { data } });
    },
  };
});

const buildStore = ({ rights = [RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN] } = {}) =>
  createStore(
    combineReducers({
      core: () => ({ user: { i_user: { rights } } }),
      ledger: reducer,
    }),
    applyMiddleware(thunk),
  );

const renderPage = (store) =>
  render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <AccountingPeriodsPage />
      </IntlProvider>
    </Provider>,
  );

describe("AccountingPeriodsPage", () => {
  beforeEach(() => {
    resetAccountingPeriodsMock();
    vi.clearAllMocks();
  });

  it("lists the periods with their status badges for an administrator", async () => {
    renderPage(buildStore());

    const table = await screen.findByRole("table");
    expect(screen.getByText("2026-07-01 — 2026-07-31")).toBeInTheDocument();
    expect(screen.getByText("2026-06-01 — 2026-06-30")).toBeInTheDocument();
    expect(within(table).getByText("ledger.periods.status.open")).toBeInTheDocument();
    expect(within(table).getByText("ledger.periods.status.closed")).toBeInTheDocument();
  });

  it("enables only the lifecycle actions valid for each period status", async () => {
    renderPage(buildStore());

    // July is the only open period -> lock; June is the most recent closed -> reopen.
    expect(await screen.findByText("ledger.periods.action.lock")).toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.reopen")).toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.close")).not.toBeInTheDocument();
  });

  it("hides the lifecycle controls and the open form for a reporting-only user", async () => {
    renderPage(buildStore({ rights: [RIGHT_LEDGER_REPORTING] }));

    expect(await screen.findByText("2026-07-01 — 2026-07-31")).toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.lock")).not.toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.open")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ledger.periods.openForm.startDate")).not.toBeInTheDocument();
    expect(screen.getByText("ledger.periods.adminOnlyNotice")).toBeInTheDocument();
  });

  it("filters the list by status without breaking the action logic", async () => {
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    expect(screen.getByText("2026-06-01 — 2026-06-30")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.periods.filter.status"), {
      target: { value: "closed" },
    });

    expect(screen.getByText("2026-06-01 — 2026-06-30")).toBeInTheDocument();
    expect(screen.queryByText("2026-07-01 — 2026-07-31")).not.toBeInTheDocument();
    // June is still evaluated against the full list: it stays the most recent
    // closed period, so its Reopen action remains available.
    expect(screen.getByText("ledger.periods.action.reopen")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.periods.filter.status"), {
      target: { value: "open" },
    });

    expect(screen.getByText("2026-07-01 — 2026-07-31")).toBeInTheDocument();
    expect(screen.queryByText("2026-06-01 — 2026-06-30")).not.toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.lock")).toBeInTheDocument();
  });

  it("shows an access denied message for a user without any ledger right", () => {
    const { container } = renderPage(buildStore({ rights: [] }));

    expect(container).toHaveTextContent("ledger.accessDenied");
  });

  it("shows a transport error surfaced in periodMutation.error", () => {
    const store = buildStore();
    store.dispatch({
      type: `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_ERR`,
      payload: { message: "Network error" },
    });
    renderPage(store);

    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it("shows the backend rejection reason when opening while a period is still open", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-08-31" },
    });
    await user.click(screen.getByText("ledger.periods.action.open"));

    expect(screen.getByText(/Cannot open a new period while 2026-07-01 — 2026-07-31 is still open/)).toBeInTheDocument();
  });

  it("supports the full lifecycle: lock, close, then open a new period", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    await user.click(screen.getByText("ledger.periods.action.lock"));
    const table = await screen.findByRole("table");
    expect(await within(table).findByText("ledger.periods.status.locked")).toBeInTheDocument();

    await user.click(screen.getByText("ledger.periods.action.close"));
    expect(await screen.findByText("ledger.periods.action.reopen")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-08-31" },
    });
    await user.click(screen.getByText("ledger.periods.action.open"));

    expect(await screen.findByText("2026-08-01 — 2026-08-31")).toBeInTheDocument();
    expect(within(table).getAllByText("ledger.periods.status.open").length).toBe(1);
    expect(within(table).getAllByText("ledger.periods.status.closed").length).toBe(2);
  });
});
