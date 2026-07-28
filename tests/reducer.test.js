import { describe, expect, it } from "vitest";
import reducer, { initialState, ACTION_TYPE } from "../src/reducer";

const reqType = (name) => `${name}_REQ`;
const respType = (name) => `${name}_RESP`;
const errType = (name) => `${name}_ERR`;

describe("ledger reducer — initial state", () => {
  it("matches the documented data-model.md shape (all slices present)", () => {
    expect(Object.keys(initialState).sort()).toEqual(
      [
        "ledgerEntries",
        "partySearch",
        "partyLedgerBalance",
        "funderSearch",
        "funderActivityReport",
        "accountingPeriods",
        "periodMutation",
        "manualReviewQueue",
        "reviewResolution",
        "exportJobs",
        "deploymentConfiguration",
        "externalSystems",
        "currencyCodes",
        "chartOfAccounts",
      ].sort(),
    );
    expect(initialState.ledgerEntries).toMatchObject({ isFetching: false, isFetched: false, error: null, items: [] });
    expect(initialState.accountingPeriods).toEqual({ isFetching: false, isFetched: false, error: null, items: [] });
  });
});

describe("ledger reducer — LEDGER_ENTRIES (US1)", () => {
  it("sets isFetching on request and stores the resolved filters", () => {
    const action = { type: reqType(ACTION_TYPE.LEDGER_ENTRIES), meta: { filters: { accountingPeriodId: "p1" } } };
    const state = reducer(undefined, action);
    expect(state.ledgerEntries.isFetching).toBe(true);
    expect(state.ledgerEntries.filters.accountingPeriodId).toBe("p1");
  });

  it("maps Relay edges into flat items with computed totals on success", () => {
    const action = {
      type: respType(ACTION_TYPE.LEDGER_ENTRIES),
      payload: {
        data: {
          ledgerEntries: {
            totalCount: 1,
            pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: "a", endCursor: "b" },
            edges: [
              {
                node: {
                  id: "e1",
                  journal: { code: "GL", name: "General" },
                  accountingPeriod: { id: "p1", status: "open" },
                  sourceEventType: "invoice",
                  sourceEventReference: "INV-001",
                  postedAt: "2026-07-01",
                  lines: [
                    { id: "l1", account: { code: "411", name: "Receivable" }, debit: 100, credit: null },
                    { id: "l2", account: { code: "700", name: "Revenue" }, debit: null, credit: 100 },
                  ],
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(undefined, action);
    expect(state.ledgerEntries.isFetching).toBe(false);
    expect(state.ledgerEntries.isFetched).toBe(true);
    expect(state.ledgerEntries.items).toHaveLength(1);
    expect(state.ledgerEntries.items[0].totals).toEqual({ debit: 100, credit: 100, balance: 0 });
    expect(state.ledgerEntries.pageInfo).toEqual({
      totalCount: 1,
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "a",
      endCursor: "b",
    });
  });

  it("surfaces a server error and stops fetching on failure", () => {
    const action = { type: errType(ACTION_TYPE.LEDGER_ENTRIES), payload: { message: "network down" } };
    const state = reducer(undefined, action);
    expect(state.ledgerEntries.isFetching).toBe(false);
    expect(state.ledgerEntries.error).toEqual({ message: "network down" });
  });
});

describe("ledger reducer — ACCOUNTING_PERIODS", () => {
  it("populates items from the flat (non-paginated) accountingPeriods array", () => {
    const action = {
      type: respType(ACTION_TYPE.ACCOUNTING_PERIODS),
      payload: {
        data: {
          accountingPeriods: [{ id: "p1", startDate: "2026-01-01", endDate: "2026-01-31", status: "open" }],
        },
      },
    };
    const state = reducer(undefined, action);
    expect(state.accountingPeriods.isFetched).toBe(true);
    expect(state.accountingPeriods.items).toEqual([
      { id: "p1", startDate: "2026-01-01", endDate: "2026-01-31", status: "open" },
    ]);
  });
});
