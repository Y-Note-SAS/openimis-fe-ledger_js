import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import {
  fetchLedgerEntriesMock,
  fetchAccountingPeriodsMock,
  fetchPartyLedgerBalanceMock,
  searchPartyMock,
  searchFunderMock,
  fetchFunderActivityReportMock,
  fetchManualReviewQueueMock,
  resolveManualReviewItemMock,
  resetManualReviewQueueMock,
  resetAccountingPeriodsMock,
  openAccountingPeriodMock,
  lockAccountingPeriodMock,
  closeAccountingPeriodMock,
  reopenAccountingPeriodMock,
  fetchLedgerEntries,
  fetchAccountingPeriods,
  searchParty,
  searchFunder,
  fetchPartyLedgerBalance,
  resetPartyLedgerBalance,
  fetchFunderActivityReport,
  fetchManualReviewQueue,
  resolveManualReviewItem,
  openAccountingPeriod,
  lockAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
  exportAccountingPeriod,
  pollExportJob,
  fetchLedgerDeploymentReferenceData,
  configureDeployment,
} from "../src/actions";
import reducer, { ACTION_TYPE } from "../src/reducer";
import { EXPORT_FORMAT } from "../src/constants";

describe("Actions - Mocks", () => {
  let dispatch;

  beforeEach(() => {
    dispatch = vi.fn();
  });

  it("fetchLedgerEntriesMock dispatches REQ and RESP", () => {
    const thunk = fetchLedgerEntriesMock(["first: 5"]);
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_REQ`,
      meta: { filters: {} },
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: expect.objectContaining({
        data: expect.objectContaining({
          ledgerEntries: expect.objectContaining({
            totalCount: expect.any(Number),
          }),
        }),
      }),
      meta: { params: ["first: 5"] },
    });
  });

  it("fetchLedgerEntriesMock filters by accountingPeriod", () => {
    const thunk = fetchLedgerEntriesMock(['accountingPeriod: "1"']);
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalled();
    const respCall = dispatch.mock.calls.find((call) => call[0].type === `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`);
    expect(respCall).toBeDefined();
    const entries = respCall[0].payload.data.ledgerEntries.edges;
    entries.forEach((edge) => {
      expect(edge.node.accountingPeriod.id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
    });
  });

  it("fetchAccountingPeriodsMock dispatches REQ and RESP", () => {
    const thunk = fetchAccountingPeriodsMock();
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ`,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: expect.objectContaining({
        data: expect.objectContaining({
          accountingPeriods: expect.arrayContaining([expect.objectContaining({ status: expect.any(String) })]),
        }),
      }),
    });
  });

  it("searchPartyMock returns parties matching search term", () => {
    const thunk = searchPartyMock("Hospital");
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    const respCall = dispatch.mock.calls.find((call) => call[0].type === `${ACTION_TYPE.PARTY_SEARCH}_RESP`);
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBeGreaterThan(0);
    results.forEach((party) => {
      expect(party.displayName.toLowerCase()).toContain("hospital");
    });
  });

  it("searchPartyMock returns all parties when search term is empty", () => {
    const thunk = searchPartyMock("");
    thunk(dispatch);

    const respCall = dispatch.mock.calls.find((call) => call[0].type === `${ACTION_TYPE.PARTY_SEARCH}_RESP`);
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBe(7);
  });

  it("searchFunderMock returns funders matching search term", () => {
    const thunk = searchFunderMock("GIZ");
    thunk(dispatch);

    const respCall = dispatch.mock.calls.find((call) => call[0].type === `${ACTION_TYPE.FUNDER_SEARCH}_RESP`);
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBe(1);
    expect(results[0].displayName).toBe("GIZ");
  });

  // Test pour fetchPartyLedgerBalanceMock (version "Updated upstream")
  it("fetchPartyLedgerBalanceMock dispatches REQ and RESP with the party/period statement", () => {
    // period id is the DECODED id the picker sends (the reducer decodes ids)
    const thunk = fetchPartyLedgerBalanceMock(btoa("AnalyticValue:HF-1"), "1");
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_REQ`,
    });
    const resp = dispatch.mock.calls[1][0];
    expect(resp.type).toBe(`${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`);
    const ledger = resp.payload.data.partyLedgerBalance;
    expect(ledger.transactions.length).toBe(2);
    expect(ledger.balance).toBe(12000);
    expect(ledger.carriedForwardBalance).toBe(12000);
  });

  it("fetchPartyLedgerBalanceMock varies the statement by party and period", () => {
    const hf1Open = fetchPartyLedgerBalanceMock(btoa("AnalyticValue:HF-1"), "1");
    hf1Open(dispatch);
    const hf1OpenLedger = dispatch.mock.calls[1][0].payload.data.partyLedgerBalance;

    const hf2Open = fetchPartyLedgerBalanceMock(btoa("AnalyticValue:HF-2"), "1");
    hf2Open(dispatch);
    const hf2OpenLedger = dispatch.mock.calls[3][0].payload.data.partyLedgerBalance;

    const fam1Closed = fetchPartyLedgerBalanceMock(btoa("AnalyticValue:FAM-1"), "2");
    fam1Closed(dispatch);
    const fam1ClosedLedger = dispatch.mock.calls[5][0].payload.data.partyLedgerBalance;

    expect(hf1OpenLedger.transactions.length).toBe(2);
    expect(hf1OpenLedger.balance).toBe(12000);
    expect(hf2OpenLedger.transactions.length).toBe(1);
    expect(hf2OpenLedger.balance).toBe(-8400);
    expect(fam1ClosedLedger.transactions.length).toBe(0);
    expect(fam1ClosedLedger.carriedForwardBalance).toBe(500);
  });

  // Test pour fetchFunderActivityReportMock (version "Stashed changes")
  it("fetchFunderActivityReportMock dispatches REQ and RESP with the funder report", () => {
    const thunk = fetchFunderActivityReportMock(btoa("AnalyticValue:GIZ"), {});
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_REQ`,
    });
    const resp = dispatch.mock.calls[1][0];
    expect(resp.type).toBe(`${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_RESP`);
    const report = resp.payload.data.funderActivityReport;
    expect(report.debitTotal).toBe(33400);
    expect(report.creditTotal).toBe(33400);
    expect(report.balance).toBe(4700);
    expect(report.byCategory).toEqual([
      expect.objectContaining({ category: "claim_payment", debit: 18600 }),
      expect.objectContaining({ category: "correction", debit: 2100 }),
      expect.objectContaining({ category: "invoice", debit: 2700 }),
      expect.objectContaining({ category: "payment_point_reconciliation", debit: 800 }),
      expect.objectContaining({ category: "payroll_disbursement", debit: 9200 }),
    ]);
  });

  it("fetchFunderActivityReportMock varies by funder and period range", () => {
    const wb = fetchFunderActivityReportMock(btoa("AnalyticValue:WB"), {});
    wb(dispatch);
    const wbReport = dispatch.mock.calls[1][0].payload.data.funderActivityReport;
    expect(wbReport.debitTotal).toBe(18700);
    expect(wbReport.balance).toBe(-1200);

    const gizJune = fetchFunderActivityReportMock(btoa("AnalyticValue:GIZ"), { end: "2" });
    gizJune(dispatch);
    const gizJuneReport = dispatch.mock.calls[3][0].payload.data.funderActivityReport;
    expect(gizJuneReport.debitTotal).toBe(6100);
    expect(gizJuneReport.byCategory).toEqual([expect.objectContaining({ category: "claim_payment", debit: 6100 })]);

    // start=July ("1") / end=June ("2") spans the whole range: every combination returns data.
    const gizAll = fetchFunderActivityReportMock(btoa("AnalyticValue:GIZ"), { start: "1", end: "2" });
    gizAll(dispatch);
    const gizAllReport = dispatch.mock.calls[5][0].payload.data.funderActivityReport;
    expect(gizAllReport.debitTotal).toBe(33400);
    expect(gizAllReport.creditTotal).toBe(33400);
  });
});

describe("Actions - Period export", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an export mutation action with the selected period and format", () => {
    const action = exportAccountingPeriod("period-1", EXPORT_FORMAT.OHADA_FEC);

    expect(action.variables).toEqual({
      accountingPeriodId: "period-1",
      format: EXPORT_FORMAT.OHADA_FEC,
    });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_REQ`,
      `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_RESP`,
      `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_ERR`,
    ]);
  });

  it("stops polling when the export reaches a terminal status", async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn(() => Promise.resolve());
    const getState = vi.fn(() => ({
      ledger: { exportJobs: { byPeriodId: { "period-1": { status: "complete" } } } },
    }));

    const stop = pollExportJob("period-1", 1000)(dispatch, getState);
    await Promise.resolve();
    const callsAfterFirstTick = dispatch.mock.calls.length;

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    expect(dispatch.mock.calls.length).toBe(callsAfterFirstTick);
    stop();
  });

  it("clears the polling interval when stop is called", async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn(() => Promise.resolve());
    const getState = vi.fn(() => ({
      ledger: { exportJobs: { byPeriodId: { "period-1": { status: "in_progress" } } } },
    }));

    const stop = pollExportJob("period-1", 1000)(dispatch, getState);
    await Promise.resolve();
    const callsBeforeStop = dispatch.mock.calls.length;
    stop();

    vi.advanceTimersByTime(3000);
    await Promise.resolve();

    expect(dispatch.mock.calls.length).toBe(callsBeforeStop);
  });
});

describe("Actions - Deployment configuration", () => {
  it("builds the deployment reference-data query action", () => {
    const action = fetchLedgerDeploymentReferenceData();

    expect(action.operation).toContain("LedgerDeploymentReferenceData");
    expect(action.variables).toEqual({});
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_REQ`,
      `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
      `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_ERR`,
    ]);
  });

  it("builds the deployment configuration mutation action", () => {
    const action = configureDeployment("replicated", "odoo", "XAF", "account-1");

    expect(action.operation).toContain("ConfigureDeployment");
    expect(action.variables).toEqual({
      operatingMode: "replicated",
      externalSystem: "odoo",
      currencyCode: "XAF",
      retainedEarningsAccountId: "account-1",
    });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_REQ`,
      `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_RESP`,
      `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_ERR`,
    ]);
  });
});

describe("Actions - Real API calls", () => {
  it("searchParty delegates to the analyticValues query", () => {
    const action = searchParty("Family");
    expect(action.operation).toContain("AnalyticValues");
    expect(action.variables).toEqual({ search: "Family", tagType: "party" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.PARTY_SEARCH}_REQ`,
      `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
      `${ACTION_TYPE.PARTY_SEARCH}_ERR`,
    ]);
  });

  it("fetchPartyLedgerBalance delegates to the PartyLedgerBalance query", () => {
    const action = fetchPartyLedgerBalance("analytic-1", "period-1");
    expect(action.operation).toContain("PartyLedgerBalance");
    expect(action.variables).toEqual({ analyticValueId: "analytic-1", accountingPeriod: "period-1" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_REQ`,
      `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
      `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_ERR`,
    ]);
  });

  it("fetchLedgerEntries is defined", () => {
    expect(fetchLedgerEntries).toBeDefined();
  });

  it("fetchAccountingPeriods is defined", () => {
    expect(fetchAccountingPeriods).toBeDefined();
  });

  it("searchFunder builds the analyticValues query with tagType funder", () => {
    const action = searchFunder("GIZ");
    expect(action.operation).toContain("analyticValues");
    expect(action.operation).toContain("tagType");
    expect(action.variables).toEqual({ search: "GIZ", tagType: "funder" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.FUNDER_SEARCH}_REQ`,
      `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
      `${ACTION_TYPE.FUNDER_SEARCH}_ERR`,
    ]);
  });

  it("fetchFunderActivityReport builds the FunderActivityReport query with period range", () => {
    const action = fetchFunderActivityReport("analytic-1", { start: "period-1", end: "period-2" });
    expect(action.operation).toContain("funderActivityReport");
    expect(action.variables).toEqual({
      analyticValueId: "analytic-1",
      accountingPeriodStart: "period-1",
      accountingPeriodEnd: "period-2",
    });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_REQ`,
      `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_RESP`,
      `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_ERR`,
    ]);
  });

  it("resetPartyLedgerBalance returns the reset action", () => {
    expect(resetPartyLedgerBalance()).toEqual({ type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET}` });
  });

  it("fetchFunderActivityReport defaults the period range to null", () => {
    const action = fetchFunderActivityReport("analytic-1");
    expect(action.variables).toEqual({
      analyticValueId: "analytic-1",
      accountingPeriodStart: null,
      accountingPeriodEnd: null,
    });
  });
});

describe("Actions - Mocks (US4 period lifecycle)", () => {
  const buildStore = () =>
    createStore(
      combineReducers({
        core: () => ({ user: { i_user: { rights: [] } } }),
        ledger: reducer,
      }),
      applyMiddleware(thunk),
    );

  beforeEach(() => {
    resetAccountingPeriodsMock();
  });

  it("openAccountingPeriodMock appends a new open period once no unclosed period blocks it", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    // July ("1") is open: close it first, then August can be opened.
    await store.dispatch(lockAccountingPeriodMock("1"));
    await store.dispatch(closeAccountingPeriodMock("1"));

    await store.dispatch(openAccountingPeriodMock("2026-08-01", "2026-08-31"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toBe(null);
    expect(state.accountingPeriods.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startDate: "2026-08-01", endDate: "2026-08-31", status: "open" }),
      ]),
    );
  });

  it("openAccountingPeriodMock rejects while an unclosed period still exists", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());

    await store.dispatch(openAccountingPeriodMock("2026-08-01", "2026-08-31"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toContain("is still open");
    expect(state.accountingPeriods.items).toHaveLength(2);
  });

  it("lockAccountingPeriodMock locks the earliest open period", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());

    await store.dispatch(lockAccountingPeriodMock("1"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toBe(null);
    expect(state.accountingPeriods.items.find((p) => p.id === "1").status).toBe("locked");
  });

  it("lockAccountingPeriodMock rejects locking a later open period while an earlier one is still open", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    // Reopen June ("2"): now both June and July are open, June being the earliest.
    await store.dispatch(reopenAccountingPeriodMock("2"));

    await store.dispatch(lockAccountingPeriodMock("1"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toContain("while period");
    expect(state.accountingPeriods.items.find((p) => p.id === "1").status).toBe("open");
  });

  it("closeAccountingPeriodMock rejects closing a later locked period while an earlier one is still locked", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    await store.dispatch(lockAccountingPeriodMock("1"));
    // Reopen June and lock it too: now both are locked, June being the earliest.
    await store.dispatch(reopenAccountingPeriodMock("2"));
    await store.dispatch(lockAccountingPeriodMock("2"));

    await store.dispatch(closeAccountingPeriodMock("1"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toContain("while period");
    expect(state.accountingPeriods.items.find((p) => p.id === "1").status).toBe("locked");
  });

  it("reopenAccountingPeriodMock rejects reopening a closed period when a later one is already closed", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    await store.dispatch(lockAccountingPeriodMock("1"));
    await store.dispatch(closeAccountingPeriodMock("1"));

    // June ("2") is no longer the most recent closed period (July is).
    await store.dispatch(reopenAccountingPeriodMock("2"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toContain("while period");
    expect(state.accountingPeriods.items.find((p) => p.id === "2").status).toBe("closed");
  });

  it("reopenAccountingPeriodMock reopens the most recent closed period", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    await store.dispatch(lockAccountingPeriodMock("1"));
    await store.dispatch(closeAccountingPeriodMock("1"));

    await store.dispatch(reopenAccountingPeriodMock("1"));

    const state = store.getState().ledger;
    expect(state.periodMutation.lastRejectionReason).toBe(null);
    expect(state.accountingPeriods.items.find((p) => p.id === "1").status).toBe("open");
  });

  it("openAccountingPeriodMock keeps generated ids unique beyond a single digit", async () => {
    const store = buildStore();
    await store.dispatch(fetchAccountingPeriodsMock());
    for (let month = 8; month <= 19; month += 1) {
      const open = store.getState().ledger.accountingPeriods.items.find((period) => period.status === "open");
      await store.dispatch(lockAccountingPeriodMock(open.id));
      await store.dispatch(closeAccountingPeriodMock(open.id));
      const start = `2026-${String(month).padStart(2, "0")}-01`;
      const end = `2026-${String(month).padStart(2, "0")}-28`;
      await store.dispatch(openAccountingPeriodMock(start, end));
    }
    const ids = store.getState().ledger.accountingPeriods.items.map((period) => period.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Actions - Real API calls (US4)", () => {
  it("openAccountingPeriod builds the OpenAccountingPeriod mutation", () => {
    const action = openAccountingPeriod("2026-08-01", "2026-08-31");
    expect(action.operation).toContain("OpenAccountingPeriod");
    expect(action.variables).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_REQ`,
      `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
      `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_ERR`,
    ]);
  });

  it("lockAccountingPeriod builds the LockAccountingPeriod mutation", () => {
    const action = lockAccountingPeriod("1");
    expect(action.operation).toContain("LockAccountingPeriod");
    expect(action.variables).toEqual({ accountingPeriodId: "1" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_REQ`,
      `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_RESP`,
      `${ACTION_TYPE.LOCK_ACCOUNTING_PERIOD}_ERR`,
    ]);
  });

  it("closeAccountingPeriod builds the CloseAccountingPeriod mutation", () => {
    const action = closeAccountingPeriod("1");
    expect(action.operation).toContain("CloseAccountingPeriod");
    expect(action.variables).toEqual({ accountingPeriodId: "1" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_REQ`,
      `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_RESP`,
      `${ACTION_TYPE.CLOSE_ACCOUNTING_PERIOD}_ERR`,
    ]);
  });

  it("reopenAccountingPeriod builds the ReopenAccountingPeriod mutation", () => {
    const action = reopenAccountingPeriod("1");
    expect(action.operation).toContain("ReopenAccountingPeriod");
    expect(action.variables).toEqual({ accountingPeriodId: "1" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_REQ`,
      `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_RESP`,
      `${ACTION_TYPE.REOPEN_ACCOUNTING_PERIOD}_ERR`,
    ]);
  });
});

describe("Actions - Manual review queue (US5)", () => {
  let dispatch;

  beforeEach(() => {
    dispatch = vi.fn();
    resetManualReviewQueueMock();
  });

  it("fetchManualReviewQueue builds the queue query with an optional status", () => {
    const action = fetchManualReviewQueue("pending");

    expect(action.operation).toContain("ManualReviewQueue");
    expect(action.variables).toEqual({ status: "pending" });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_REQ`,
      `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_RESP`,
      `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_ERR`,
    ]);
  });

  it("resolveManualReviewItem builds the resolution mutation", () => {
    const action = resolveManualReviewItem("review-1", "entry-2", "Corrected manually");

    expect(action.operation).toContain("ResolveManualReviewItem");
    expect(action.variables).toEqual({
      reviewItemId: "review-1",
      correctingTransactionId: "entry-2",
      resolutionNote: "Corrected manually",
    });
    expect(action.actionTypes).toEqual([
      `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_REQ`,
      `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
      `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_ERR`,
    ]);
  });

  it("mock queue and resolution update the item from pending to resolved", () => {
    fetchManualReviewQueueMock("pending")(dispatch);
    const queueResponse = dispatch.mock.calls[1][0].payload.data.manualReviewQueue;
    expect(queueResponse).toHaveLength(4);
    expect(queueResponse[0]).toMatchObject({ id: "review-1", status: "pending" });

    dispatch.mockClear();
    resolveManualReviewItemMock("review-1", "11", "Correction linked")(dispatch);
    const resolutionResponse = dispatch.mock.calls[1][0].payload.data.resolveManualReviewItem;
    expect(resolutionResponse.errors).toEqual([]);
    expect(resolutionResponse.manualReviewQueueItem).toMatchObject({
      id: "review-1",
      status: "resolved",
      correctingEntryId: "11",
      resolutionNote: "Correction linked",
    });
  });
});
