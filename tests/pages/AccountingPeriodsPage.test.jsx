import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { __resetAccountingPeriods } from "@openimis/fe-core";
import reducer, { ACTION_TYPE } from "../../src/reducer";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../../src/constants";
import AccountingPeriodsPage from "../../src/pages/AccountingPeriodsPage";

/** `journalize` is bound by `connect`: spy on it through the fe-core mock. It
 * must return a plain action, since react-redux dispatches its return value. */
const journalizeSpy = vi.hoisted(() => vi.fn((mutation) => ({ type: "MOCK_JOURNALIZE", payload: mutation })));
const { mutationLabels } = vi.hoisted(() => ({ mutationLabels: [] }));

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
    journalize: journalizeSpy,
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
      mutationLabels.push(params?.clientMutationLabel ?? null);
      dispatch({ type: types[0], meta: params });
      await roundTrip();
      const blocker = periods.find((period) => period.status === "open" || period.status === "locked");
      // `\b` keeps "reopenAccountingPeriod" from matching "openAccountingPeriod".
      const operation = [
        "openAccountingPeriod",
        "lockAccountingPeriod",
        "closeAccountingPeriod",
        "reopenAccountingPeriod",
      ].find((name) => new RegExp(`\\b${name}\\(`).test(String(payload)));

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

      const nextStatus = {
        lockAccountingPeriod: "locked",
        closeAccountingPeriod: "closed",
        reopenAccountingPeriod: "open",
      }[operation];
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
    mutationLabels.length = 0;
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
    const user = userEvent.setup();
    renderPage(buildStore());

    // July is the only open period -> lock. A closed period is final: the
    // backend only reopens LOCKED periods, so June offers nothing.
    expect(await screen.findByText("ledger.periods.action.lock")).toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.reopen")).not.toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.close")).not.toBeInTheDocument();

    await user.click(screen.getByText("ledger.periods.action.lock"));

    // Once locked, the earliest non-closed period can be closed (or unlocked).
    expect(await screen.findByText("ledger.periods.action.close")).toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.reopen")).toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.lock")).not.toBeInTheDocument();
  });

  it("hides the lifecycle controls and the open form for a reporting-only user", async () => {
    renderPage(buildStore({ rights: [RIGHT_LEDGER_REPORTING] }));

    expect(await screen.findByText("2026-07-01 — 2026-07-31")).toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.lock")).not.toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.open")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ledger.periods.openForm.startDate")).not.toBeInTheDocument();
    expect(screen.getByText("ledger.periods.adminOnlyNotice")).toBeInTheDocument();
  });

  it("hands a completed lifecycle mutation to the JournalDrawer", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    await user.click(screen.getByText("ledger.periods.action.lock"));

    // Journaling happens on the `submittingMutation` true -> false transition:
    // it used to be swallowed by the effect storing the previous value.
    await waitFor(() => expect(journalizeSpy).toHaveBeenCalled());
    expect(journalizeSpy.mock.calls.at(-1)[0]).toMatchObject({ clientMutationId: "mock-client-mutation-id" });
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
    // A closed period is final backend-side: no lifecycle action is offered.
    expect(screen.queryByText("ledger.periods.action.reopen")).not.toBeInTheDocument();
    expect(screen.queryByText("ledger.periods.action.lock")).not.toBeInTheDocument();

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

  it("blocks a period that overlaps an existing one, like the backend", async () => {
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-07-15" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-08-15" },
    });

    expect(screen.getByText("ledger.periods.openForm.errors.overlap")).toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.open")).toBeDisabled();
  });

  it("blocks a period that does not start after the latest existing period", async () => {
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-05-31" },
    });

    expect(screen.getByText("ledger.periods.openForm.errors.chronology")).toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.open")).toBeDisabled();
  });

  it("enables the open action for a period starting after the latest one", async () => {
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-08-31" },
    });

    expect(screen.queryByText(/ledger.periods.openForm.errors/)).not.toBeInTheDocument();
    expect(screen.getByText("ledger.periods.action.open")).not.toBeDisabled();
  });

  it("labels the lifecycle mutations with the module translations (JournalDrawer)", async () => {
    const user = userEvent.setup();
    renderPage(buildStore());

    await screen.findByText("2026-07-01 — 2026-07-31");
    await user.click(screen.getByText("ledger.periods.action.lock"));

    await waitFor(() => expect(mutationLabels).toContain("ledger.periods.mutationLabel.lock"));
    // the English default of the action must not leak into the drawer
    expect(mutationLabels).not.toContain("Lock accounting period");
  });

  it("supports the full lifecycle: lock, close, then open a new period", async () => {
    const user = userEvent.setup();
    const store = buildStore();
    renderPage(store);

    await screen.findByText("2026-07-01 — 2026-07-31");
    // The lifecycle buttons are disabled while a mutation is in flight: wait for
    // the settled state before clicking the next one, and re-query the table
    // (each refresh re-renders it) before asserting its content.
    const clickAction = async (action) => {
      const button = await screen.findByText(`ledger.periods.action.${action}`);
      await waitFor(() => expect(button).toBeEnabled());
      await user.click(button);
    };
    const tableStatus = (status) => within(screen.getByRole("table")).getAllByText(`ledger.periods.status.${status}`);

    await clickAction("lock");
    await waitFor(() => expect(tableStatus("locked")).toHaveLength(1));

    // A locked period can be unlocked (reopened) before being closed.
    await clickAction("reopen");
    await waitFor(() => expect(tableStatus("open")).toHaveLength(1));

    await clickAction("lock");
    await waitFor(() => expect(tableStatus("locked")).toHaveLength(1));

    await clickAction("close");
    // June and July are closed once the mutation settled.
    await waitFor(() => expect(tableStatus("closed")).toHaveLength(2));
    expect(screen.queryByText("ledger.periods.action.reopen")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.startDate"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("ledger.periods.openForm.endDate"), {
      target: { value: "2026-08-31" },
    });
    await user.click(screen.getByText("ledger.periods.action.open"));

    expect(await screen.findByText("2026-08-01 — 2026-08-31")).toBeInTheDocument();
    // Scoped to the table: the status filter <select> also carries those labels.
    await waitFor(() => expect(tableStatus("open")).toHaveLength(1));
    expect(tableStatus("closed")).toHaveLength(2);

    // Every successive mutation is journalized (lock → reopen → lock → close →
    // open), which is the whole point of the `true -> false` transition: the
    // effect reads the mutation of the render where the transition is observed,
    // so nothing is missed or logged twice.
    await waitFor(() => expect(journalizeSpy).toHaveBeenCalledTimes(5));
  });
});
