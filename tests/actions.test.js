import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLedgerEntriesMock,
  fetchAccountingPeriodsMock,
  fetchPartyLedgerBalanceMock,
  searchPartyMock,
  searchFunderMock,
  fetchFunderActivityReportMock,
  fetchLedgerEntries,
  fetchAccountingPeriods,
  searchParty,
  searchFunder,
  fetchPartyLedgerBalance,
  fetchFunderActivityReport,
} from "../src/actions";
import { ACTION_TYPE } from "../src/reducer";

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

  it("fetchFunderActivityReport defaults the period range to null", () => {
    const action = fetchFunderActivityReport("analytic-1");
    expect(action.variables).toEqual({
      analyticValueId: "analytic-1",
      accountingPeriodStart: null,
      accountingPeriodEnd: null,
    });
  });
});