import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { applyMiddleware, combineReducers, createStore } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer from "../../src/reducer";
import ManualReviewQueuePage from "../../src/pages/ManualReviewQueuePage";
import { RIGHT_LEDGER_ADMIN } from "../../src/constants";
import { filterCorrectingEntryCandidates } from "../../src/utils/correctingEntryCandidates";

const encodedId = (type, id) => btoa(`${type}:${id}`);

// One leg per side so the reducers build the debit/credit totals the way the
// real `ledgerEntries` connection does.
const entryLegs = (amount) => ({
  balance: 0,
  legs: {
    edges: [
      {
        node: {
          id: encodedId("LedgerEntryLine", `${amount}-d`),
          debit: amount,
          credit: null,
          account: { code: "4010" },
        },
      },
      {
        node: {
          id: encodedId("LedgerEntryLine", `${amount}-c`),
          debit: null,
          credit: amount,
          account: { code: "5120" },
        },
      },
    ],
  },
});

const ledgerEntryNode = ({ id, postedAt, journalCode, periodId, partyId, partyDisplayName, sourceEventReference }) => ({
  id: encodedId("LedgerEntry", id),
  journal: { id: encodedId("LedgerJournal", journalCode), code: journalCode, name: journalCode },
  accountingPeriod: {
    id: encodedId("AccountingPeriod", periodId),
    code: "2026-07",
    name: "July",
    status: "open",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  },
  sourceEventType: "claim_payment",
  sourceEventReference,
  postedAt,
  party: { id: encodedId("AnalyticValue", partyId), displayName: partyDisplayName },
  funder: null,
  transaction: entryLegs(1000),
});

// `manualReviewQueue` is a paginated connection of replication records.
const queueNode = ({ id, status, rejectionReason, ledgerEntry }) => ({
  id,
  createdAt: "2026-07-25T08:30:00Z",
  resolvedAt: null,
  resolutionNote: null,
  resolvedByTransaction: null,
  replicationRecord: {
    id: `record-${id}`,
    status,
    targetSystem: "odoo",
    rejectionReason,
    externalReference: null,
    ledgerEntry,
  },
});

const ORIGINAL_ENTRY = ledgerEntryNode({
  id: "11",
  postedAt: "2026-07-16",
  journalCode: "BANK",
  periodId: "1",
  partyId: "HF-1",
  partyDisplayName: "District Hospital",
  sourceEventReference: "CLM-2026-0011",
});

const QUEUE_NODES = [
  queueNode({
    id: "review-1",
    status: "PENDING",
    rejectionReason: "Replication rejected by Odoo",
    ledgerEntry: ORIGINAL_ENTRY,
  }),
  queueNode({
    id: "review-2",
    status: "SUCCEEDED",
    rejectionReason: "Unconfirmed posting in Sage",
    ledgerEntry: ledgerEntryNode({
      id: "7",
      postedAt: "2026-06-28",
      journalCode: "BANK",
      periodId: "2",
      partyId: "HF-1",
      partyDisplayName: "District Hospital",
      sourceEventReference: "CLM-2026-0101",
    }),
  }),
];

// The backend only returns entries of the reviewed party/period (same page as
// the ledger browser connection), the third row proving the client-side
// candidate rule still applies.
const CANDIDATE_ENTRY_NODES = [
  ORIGINAL_ENTRY,
  ledgerEntryNode({
    id: "13",
    postedAt: "2026-07-14",
    journalCode: "MISC",
    periodId: "1",
    partyId: "HF-1",
    partyDisplayName: "District Hospital",
    sourceEventReference: "PPR-2026-0013",
  }),
  ledgerEntryNode({
    id: "99",
    postedAt: "2026-07-15",
    journalCode: "SALES",
    periodId: "1",
    partyId: "FAM-2",
    partyDisplayName: "Family Smith",
    sourceEventReference: "INV-2026-0099",
  }),
];

const { captured } = vi.hoisted(() => ({
  captured: { ledgerEntryFilters: null, ledgerEntryPageInfo: null, resolved: [] },
}));

vi.mock("../../src/actions", async (importOriginal) => {
  const actions = await importOriginal();
  const { ACTION_TYPE } = await import("../../src/reducer");
  const connection = (name, nodes) => ({
    totalCount: nodes.length,
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    edges: nodes.map((node) => ({ node })),
  });
  return {
    ...actions,
    fetchAccountingPeriods: () => (dispatch) => {
      dispatch({ type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ` });
      dispatch({
        type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
        payload: {
          data: {
            accountingPeriods: connection("accountingPeriods", [
              {
                id: "1",
                startDate: "2026-07-01",
                endDate: "2026-07-31",
                status: "open",
                name: "July",
                code: "2026-07",
              },
              {
                id: "2",
                startDate: "2026-06-01",
                endDate: "2026-06-30",
                status: "closed",
                name: "June",
                code: "2026-06",
              },
            ]),
          },
        },
      });
    },
    fetchManualReviewQueue: () => (dispatch) => {
      dispatch({ type: `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_REQ` });
      dispatch({
        type: `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_RESP`,
        payload: { data: { manualReviewQueue: connection("manualReviewQueue", QUEUE_NODES) } },
      });
    },
    fetchLedgerEntries:
      (filters = {}, pageInfo = {}) =>
      (dispatch) => {
        captured.ledgerEntryFilters = filters;
        captured.ledgerEntryPageInfo = pageInfo;
        dispatch({ type: `${ACTION_TYPE.LEDGER_ENTRIES}_REQ`, meta: { filters } });
        dispatch({
          type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
          payload: { data: { ledgerEntries: connection("ledgerEntries", CANDIDATE_ENTRY_NODES) } },
          meta: { filters },
        });
      },
    resolveManualReviewItem: (recordId, transactionId, note) => (dispatch) => {
      captured.resolved.push([recordId, transactionId, note]);
      dispatch({
        type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_REQ`,
        meta: { clientMutationId: "mock-client-mutation-id", clientMutationLabel: "Resolve manual review item" },
      });
      dispatch({
        type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
        payload: {
          data: { resolveManualReview: { clientMutationId: "mock-client-mutation-id", internalId: "record-review-1" } },
        },
        meta: { clientMutationId: "mock-client-mutation-id", clientMutationLabel: "Resolve manual review item" },
      });
    },
  };
});

const buildStore = (rights = [RIGHT_LEDGER_ADMIN]) =>
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
        <ManualReviewQueuePage />
      </IntlProvider>
    </Provider>,
  );

describe("ManualReviewQueuePage", () => {
  it("loads the queue and resolves an item with a same-party/same-period correcting entry", async () => {
    const user = userEvent.setup();
    const store = buildStore();
    renderPage(store);

    expect((await screen.findAllByText("Replication rejected by Odoo"))[0]).toBeInTheDocument();

    await user.click(screen.getAllByText("ledger.reviewQueue.action.resolve")[0]);

    // The entry filters are resolved to the backend contract: decoded period id
    // (matched against the loaded periods to send its code) + encoded party id.
    expect(captured.ledgerEntryFilters).toEqual({
      accountingPeriodId: "1",
      partyAnalyticValueId: btoa("AnalyticValue:HF-1"),
    });
    expect(captured.ledgerEntryPageInfo).toEqual({ first: 100 });

    const entries = store.getState().ledger.ledgerEntries.items;
    expect(entries).toHaveLength(3);
    expect(entries[0].accountingPeriod.id).toBe("1");
    expect(
      filterCorrectingEntryCandidates(
        entries,
        store.getState().ledger.manualReviewQueue.items.find((item) => item.id === "review-1").originalEntry,
      ).map((entry) => entry.id),
    ).toEqual(["11", "13"]);

    // The dialog offers the eligible entries only and submits the selection.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("CLM-2026-0011")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /11 — BANK/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /99/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "13");
    await user.type(screen.getByLabelText("ledger.reviewQueue.dialog.resolutionNote"), "Corrected manually");
    await user.click(screen.getByText("ledger.reviewQueue.dialog.resolve"));

    expect(captured.resolved).toEqual([["review-1", "13", "Corrected manually"]]);
  });

  it("denies access without the finance administrator right", () => {
    renderPage(buildStore([]));

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
  });
});
