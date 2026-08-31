import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { applyMiddleware, combineReducers, createStore } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import reducer from "../../src/reducer";
import ManualReviewQueuePage from "../../src/pages/ManualReviewQueuePage";
import { resetManualReviewQueueMock } from "../../src/actions";
import { RIGHT_LEDGER_ADMIN } from "../../src/constants";
import { filterCorrectingEntryCandidates } from "../../src/utils/correctingEntryCandidates";

vi.mock("../../src/actions", async (importOriginal) => {
  const a = await importOriginal();
  return {
    ...a,
    fetchManualReviewQueue: a.fetchManualReviewQueueMock,
    resolveManualReviewItem: a.resolveManualReviewItemMock,
    fetchLedgerEntries: a.fetchLedgerEntriesMock,
    fetchAccountingPeriods: a.fetchAccountingPeriodsMock,
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
  beforeEach(() => resetManualReviewQueueMock());

  it("loads the mock queue and exposes a valid correcting entry", async () => {
    const store = buildStore();
    renderPage(store);

    expect((await screen.findAllByText("Replication rejected by Odoo"))[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("ledger.reviewQueue.action.resolve")[0]);

    expect(store.getState().ledger.ledgerEntries.items).toHaveLength(2);
    expect(store.getState().ledger.ledgerEntries.items[0].accountingPeriod.id).toBe("1");
    expect(store.getState().ledger.ledgerEntries.items[0].lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partyTag: expect.objectContaining({ analyticValueId: "QW5hbHl0aWNWYWx1ZTpIRi0x" }),
        }),
      ]),
    );
    expect(
      filterCorrectingEntryCandidates(
        store.getState().ledger.ledgerEntries.items,
        store.getState().ledger.manualReviewQueue.items.find((item) => item.id === "review-1").originalEntry,
      ),
    ).toHaveLength(2);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/11 — BANK/)).toBeInTheDocument();
    expect(screen.queryByText(/No correcting entries match/)).not.toBeInTheDocument();
  });

  it("denies access without the finance administrator right", () => {
    renderPage(buildStore([]));

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
  });
});
