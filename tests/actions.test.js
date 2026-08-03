import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  fetchLedgerEntriesMock, 
  fetchAccountingPeriodsMock, 
  searchPartyMock, 
  searchFunderMock,
  fetchLedgerEntries,
  fetchAccountingPeriods,
  searchParty,
  searchFunder,
  fetchPartyLedgerBalance,
  fetchFunderActivityReport
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
      meta: { filters: {} }
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: expect.objectContaining({
        data: expect.objectContaining({
          ledgerEntries: expect.objectContaining({
            totalCount: expect.any(Number)
          })
        })
      }),
      meta: { params: ["first: 5"] }
    });
  });

  it("fetchLedgerEntriesMock filters by accountingPeriod", () => {
    const thunk = fetchLedgerEntriesMock(['accountingPeriod: "1"']);
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalled();
    const respCall = dispatch.mock.calls.find(
      call => call[0].type === `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`
    );
    expect(respCall).toBeDefined();
    const entries = respCall[0].payload.data.ledgerEntries.edges;
    entries.forEach(edge => {
      expect(edge.node.accountingPeriod.id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
    });
  });

  it("fetchAccountingPeriodsMock dispatches REQ and RESP", () => {
    const thunk = fetchAccountingPeriodsMock();
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ`
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: expect.objectContaining({
        data: expect.objectContaining({
          accountingPeriods: expect.arrayContaining([
            expect.objectContaining({ status: expect.any(String) })
          ])
        })
      })
    });
  });

  it("searchPartyMock returns parties matching search term", () => {
    const thunk = searchPartyMock("Hospital");
    thunk(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    const respCall = dispatch.mock.calls.find(
      call => call[0].type === `${ACTION_TYPE.PARTY_SEARCH}_RESP`
    );
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBeGreaterThan(0);
    results.forEach(party => {
      expect(party.displayName.toLowerCase()).toContain("hospital");
    });
  });

  it("searchPartyMock returns all parties when search term is empty", () => {
    const thunk = searchPartyMock("");
    thunk(dispatch);

    const respCall = dispatch.mock.calls.find(
      call => call[0].type === `${ACTION_TYPE.PARTY_SEARCH}_RESP`
    );
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBe(7);
  });

  it("searchFunderMock returns funders matching search term", () => {
    const thunk = searchFunderMock("GIZ");
    thunk(dispatch);

    const respCall = dispatch.mock.calls.find(
      call => call[0].type === `${ACTION_TYPE.FUNDER_SEARCH}_RESP`
    );
    expect(respCall).toBeDefined();
    const results = respCall[0].payload.data.analyticValues;
    expect(results.length).toBe(1);
    expect(results[0].displayName).toBe("GIZ");
  });
});

describe("Actions - Real API calls", () => {
  it("fetchLedgerEntries is defined", () => {
    expect(fetchLedgerEntries).toBeDefined();
  });

  it("fetchAccountingPeriods is defined", () => {
    expect(fetchAccountingPeriods).toBeDefined();
  });

  it("searchParty is defined", () => {
    expect(searchParty).toBeDefined();
  });

  it("searchFunder is defined", () => {
    expect(searchFunder).toBeDefined();
  });

  it("fetchPartyLedgerBalance is defined", () => {
    expect(fetchPartyLedgerBalance).toBeDefined();
  });

  it("fetchFunderActivityReport is defined", () => {
    expect(fetchFunderActivityReport).toBeDefined();
  });
});