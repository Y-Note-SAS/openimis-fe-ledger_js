import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlWithVariables } from "@openimis/fe-core";
import { fetchLedgerEntries, fetchAccountingPeriods } from "../src/actions";
import { ACTION_TYPE } from "../src/reducer";

describe("fetchAccountingPeriods", () => {
  it("dispatches graphqlWithVariables with the AccountingPeriods query and REQ/RESP/ERR triplet", () => {
    const action = fetchAccountingPeriods("open");
    expect(action).toEqual(
      expect.objectContaining({
        variables: { status: "open" },
        actionTypes: [
          `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ`,
          `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
          `${ACTION_TYPE.ACCOUNTING_PERIODS}_ERR`,
        ],
      }),
    );
    expect(action.operation).toContain("AccountingPeriods");
  });
});

describe("fetchLedgerEntries", () => {
  const buildGetState = (accountingPeriods = []) => () => ({
    ledger: { accountingPeriods: { items: accountingPeriods } },
  });

  beforeEach(() => {
    graphqlWithVariables.mockClear();
  });

  it("defaults accountingPeriod to the current open period when not explicitly filtered (FR-001)", async () => {
    const dispatch = vi.fn((thunkOrAction) => thunkOrAction);
    const getState = buildGetState([
      { id: "p0", status: "closed" },
      { id: "p1", status: "open" },
    ]);

    await fetchLedgerEntries({})(dispatch, getState);

    expect(graphqlWithVariables).toHaveBeenCalled();
    const [, variables, , params] = graphqlWithVariables.mock.calls[0];
    expect(variables.accountingPeriod).toBe("p1");
    expect(params.filters.accountingPeriodId).toBe("p1");
  });

  it("respects an explicitly-set accountingPeriodId filter, including null (user cleared it)", async () => {
    const dispatch = vi.fn((thunkOrAction) => thunkOrAction);
    const getState = buildGetState([{ id: "p1", status: "open" }]);

    await fetchLedgerEntries({ accountingPeriodId: null })(dispatch, getState);

    const [, variables] = graphqlWithVariables.mock.calls[0];
    expect(variables.accountingPeriod).toBeNull();
  });

  it("maps view-model filter names to the backend's GraphQL argument names", async () => {
    const dispatch = vi.fn((thunkOrAction) => thunkOrAction);
    const getState = buildGetState([]);

    await fetchLedgerEntries({
      journal: "GL",
      accountingPeriodId: "p1",
      partyAnalyticValueId: "party-1",
      funderAnalyticValueId: "funder-1",
      sourceEventType: "invoice",
    })(dispatch, getState);

    const [, variables] = graphqlWithVariables.mock.calls[0];
    expect(variables).toEqual({
      journal: "GL",
      accountingPeriod: "p1",
      party: "party-1",
      funder: "funder-1",
      sourceEventType: "invoice",
      first: null,
      after: null,
    });
  });
});
