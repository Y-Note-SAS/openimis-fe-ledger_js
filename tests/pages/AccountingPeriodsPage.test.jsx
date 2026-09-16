import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { __resetAccountingPeriods } from "@openimis/fe-core";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../../src/constants";
import AccountingPeriodsPage from "../../src/pages/AccountingPeriodsPage";

// The page talks to the real GraphQL actions: the mocked fe-core stands in for
// the ledger backend, so mutations update the "server" fixture and the page
// refetches the (unchanged) query afterwards, exactly like production.
vi.mock("@openimis/fe-core", async (importOriginal) => {
  const orig = await importOriginal();
  const initialPeriods = () => [
    { id: "1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open", name: "July", code: "2026-07" },
    { id: "2", startDate: "2026-06-01", endDate: "2026-06-30", status: "closed", name: "June", code: "2026-06" },
  ];
  let periods = initialPeriods();
  const roundTrip = () => new Promise((resolve) => setTimeout(resolve, 0));
  const findPeriod = (id) => periods.find((period) => period.id === id);
  // formatMutation inlines the input in the mutation payload, so the fake
  // backend reads the arguments back from the query string.
  const argument = (payload, name) => String(payload).match(new RegExp(`${name}:\\s*"([^"]*)"`))?.[1] ?? null;

  return {
    ...orig,
    __resetAccountingPeriods: () => {
      periods = initialPeriods();
    },
    // `await roundTrip` mimics the HTTP round-trip: without it the REQ/RESP
    // dispatches are batched in the same tick and the page never observes the
    // `submittingMutation` transition that triggers the refetch.
    graphqlWithVariables: (query, variables, types) => async (dispatch) => {
      dispatch({ type: types[0] });
      await roundTrip();
      dispatch({
        type: types[1],
        payload: {
          data: {
            accountingPeriods: {
              totalCount: periods.length,
              pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
              edges: periods.map((period) => ({ node: period })),
            },
          },
        },
      });
    },
    graphql: (payload, types, params) => async (dispatch) => {
      dispatch({ type: types[0], meta: params });
      await roundTrip();
      const blocker = periods.find((period) => period.status === "open" || period.status === "locked");
      const operation = String(payload).includes("openAccountingPeriod")
        ? "openAccountingPeriod"
        : ["lockAccountingPeriod", "closeAccountingPeriod", "reopenAccountingPeriod"].find((name) =>
            String(payload).includes(name),
          );

      if (operation === "openAccountingPeriod" && blocker) {
        // OpenIMISMutation rejects through a GraphQL error (payload stays null).
        dispatch({
          type: types[1],
          payload: {
            data: { openAccountingPeriod: null },
            errors: [
              {
                message: `Cannot open a new period while ${blocker.startDate} — ${blocker.endDate} is still ${blocker.status}`,
              },
            ],
          },
          meta: params,
        });
        return;
      }

      if (operation === "openAccountingPeriod") {
        const id = String(periods.length + 1);
        periods = [
          ...periods,
          {
            id,
            startDate: argument(payload, "startDate"),
            endDate: argument(payload, "endDate"),
            name: argument(payload, "name"),
            code: argument(payload, "code"),
            status: "open",
          },
        ];
        dispatch({
          type: types[1],
          payload: { data: { openAccountingPeriod: { clientMutationId: "mock-client-mutation-id", internalId: id } } },
          meta: params,
        });
        return;
      }

      const nextStatus = { lockAccountingPeriod: "locked", closeAccountingPeriod: "closed", reopenAccountingPeriod: "open" }[
        operation
      ];
      const id = argument(payload, "id");
      const period = findPeriod(id);
      if (period) period.status = nextStatus;
      dispatch({
        type: types[1],
        payload: { data: { [operation]: { clientMutationId: "mock-client-mutation-id", internalId: id } } },
        meta: params,
      });
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
    __resetAccountingPeriods();
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

    expect(
      await screen.findByText(/Cannot open a new period while 2026-07-01 — 2026-07-31 is still open/),
    ).toBeInTheDocument();
  });

  it("supports the full lifecycle: lock, close, then open a new period", async () => {
    const user = userEvent.setup();
    const store = buildStore();
    renderPage(store);

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
