import { describe, it, expect } from "vitest";
import reducer, { initialState, ACTION_TYPE } from "../src/reducer";

describe("Reducer", () => {
  it("returns initial state", () => {
    expect(reducer(undefined, {})).toEqual(initialState);
  });

  it("handles LEDGER_LEDGER_ENTRIES_REQ", () => {
    const action = { type: `${ACTION_TYPE.LEDGER_ENTRIES}_REQ`, meta: { filters: { journal: "BANK" } } };
    const state = reducer(initialState, action);
    expect(state.ledgerEntries.isFetching).toBe(true);
    expect(state.ledgerEntries.isFetched).toBe(false);
    expect(state.ledgerEntries.error).toBe(null);
    expect(state.ledgerEntries.filters.journal).toBe("BANK");
  });

  it("handles LEDGER_LEDGER_ENTRIES_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: {
        data: {
          ledgerEntries: {
            totalCount: 10,
            pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: "0", endCursor: "9" },
            edges: [
              { node: { id: "QWNjb3VudGluZ1BlcmlvZDox", journal: { code: "BANK" }, lines: [] } }
            ]
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.ledgerEntries.isFetching).toBe(false);
    expect(state.ledgerEntries.isFetched).toBe(true);
    expect(state.ledgerEntries.items.length).toBe(1);
    expect(state.ledgerEntries.pageInfo.totalCount).toBe(10);
  });

  it("handles LEDGER_LEDGER_ENTRIES_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_ERR`,
      payload: { message: "Network error" }
    };
    const state = reducer(initialState, action);
    expect(state.ledgerEntries.isFetching).toBe(false);
    expect(state.ledgerEntries.isFetched).toBe(false);
    expect(state.ledgerEntries.error.message).toBe("Network error");
  });

  it("handles LEDGER_ACCOUNTING_PERIODS_REQ", () => {
    const action = { type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_REQ` };
    const state = reducer(initialState, action);
    expect(state.accountingPeriods.isFetching).toBe(true);
    expect(state.accountingPeriods.isFetched).toBe(false);
  });

  it("handles LEDGER_ACCOUNTING_PERIODS_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: {
        data: {
          accountingPeriods: [
            { id: "QWNjb3VudGluZ1BlcmlvZDox", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" }
          ]
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.accountingPeriods.isFetching).toBe(false);
    expect(state.accountingPeriods.isFetched).toBe(true);
    expect(state.accountingPeriods.items.length).toBe(1);
    expect(state.accountingPeriods.items[0].id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
  });

  it("handles LEDGER_PARTY_SEARCH_REQ", () => {
    const action = { type: `${ACTION_TYPE.PARTY_SEARCH}_REQ` };
    const state = reducer(initialState, action);
    expect(state.partySearch.isFetching).toBe(true);
  });

  it("handles LEDGER_PARTY_SEARCH_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
      payload: {
        data: {
          analyticValues: [
            { analyticValueId: "QWNjb3VudGluZ1BlcmlvZDox", displayName: "Party A" }
          ]
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.partySearch.isFetching).toBe(false);
    expect(state.partySearch.isFetched).toBe(true);
    expect(state.partySearch.results.length).toBe(1);
  });

  it("handles LEDGER_PARTY_SEARCH_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_SEARCH}_ERR`,
      payload: { message: "Search failed" }
    };
    const state = reducer(initialState, action);
    expect(state.partySearch.isFetching).toBe(false);
    expect(state.partySearch.error.message).toBe("Search failed");
  });

  it("handles LEDGER_PARTY_LEDGER_BALANCE_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
      payload: {
        data: {
          partyLedgerBalance: {
            analyticValueId: "1",
            debitTotal: 1000,
            creditTotal: 500,
            balance: 500,
            transactions: [
              { id: "1", journal: { code: "BANK" }, lines: [{ debit: 1000, credit: 0 }] }
            ]
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.partyLedgerBalance.isFetching).toBe(false);
    expect(state.partyLedgerBalance.isFetched).toBe(true);
    expect(state.partyLedgerBalance.data).toBeDefined();
    expect(state.partyLedgerBalance.data.debitTotal).toBe(1000);
  });

  it("handles LEDGER_PARTY_LEDGER_BALANCE_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_ERR`,
      payload: { message: "Balance failed" }
    };
    const state = reducer(initialState, action);
    expect(state.partyLedgerBalance.isFetching).toBe(false);
    expect(state.partyLedgerBalance.error.message).toBe("Balance failed");
  });

  it("handles LEDGER_FUNDER_SEARCH_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
      payload: {
        data: {
          analyticValues: [
            { analyticValueId: "QWNjb3VudGluZ1BlcmlvZDox", displayName: "Funder A" }
          ]
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.funderSearch.isFetching).toBe(false);
    expect(state.funderSearch.isFetched).toBe(true);
    expect(state.funderSearch.results.length).toBe(1);
  });

  it("handles LEDGER_FUNDER_ACTIVITY_REPORT_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_RESP`,
      payload: {
        data: {
          funderActivityReport: {
            analyticValueId: "1",
            debitTotal: 2000,
            creditTotal: 1000,
            balance: 1000
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.funderActivityReport.isFetching).toBe(false);
    expect(state.funderActivityReport.isFetched).toBe(true);
    expect(state.funderActivityReport.data).toBeDefined();
  });

  it("handles LEDGER_OPEN_ACCOUNTING_PERIOD_REQ", () => {
    const action = { type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_REQ` };
    const state = reducer(initialState, action);
    expect(state.periodMutation.submitting).toBe(true);
    expect(state.periodMutation.error).toBe(null);
  });

  it("handles LEDGER_OPEN_ACCOUNTING_PERIOD_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
      payload: {
        data: {
          openAccountingPeriod: {
            accountingPeriod: { id: "QWNjb3VudGluZ1BlcmlvZDox", startDate: "2026-08-01", endDate: "2026-08-31", status: "open" },
            errors: []
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.periodMutation.submitting).toBe(false);
    expect(state.periodMutation.error).toBe(null);
    expect(state.accountingPeriods.items.length).toBe(1);
  });

  it("handles LEDGER_OPEN_ACCOUNTING_PERIOD_RESP with errors", () => {
    const action = {
      type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_RESP`,
      payload: {
        data: {
          openAccountingPeriod: {
            errors: [{ field: "startDate", message: "Invalid date" }]
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.periodMutation.submitting).toBe(false);
    expect(state.periodMutation.error).toBe("Invalid date");
    expect(state.periodMutation.lastRejectionReason).toBe("Invalid date");
  });

  it("handles LEDGER_MANUAL_REVIEW_QUEUE_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.MANUAL_REVIEW_QUEUE}_RESP`,
      payload: {
        data: {
          manualReviewQueue: [
            { id: "QWNjb3VudGluZ1BlcmlvZDox", status: "pending" }
          ]
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.manualReviewQueue.isFetching).toBe(false);
    expect(state.manualReviewQueue.isFetched).toBe(true);
    expect(state.manualReviewQueue.items.length).toBe(1);
    expect(state.manualReviewQueue.items[0].id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
  });

  it("handles LEDGER_RESOLVE_MANUAL_REVIEW_ITEM_RESP", () => {
    const initialStateWithItem = {
      ...initialState,
      manualReviewQueue: {
        ...initialState.manualReviewQueue,
        items: [{ id: "1", status: "pending" }]
      }
    };
    const action = {
      type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
      payload: {
        data: {
          resolveManualReviewItem: {
            manualReviewQueueItem: {
              id: "1",
              status: "resolved",
              resolvedAt: "2026-07-31",
              resolutionNote: "Corrected"
            },
            errors: []
          }
        }
      }
    };
    const state = reducer(initialStateWithItem, action);
    expect(state.reviewResolution.submitting).toBe(false);
    expect(state.reviewResolution.error).toBe(null);
    expect(state.manualReviewQueue.items[0].status).toBe("resolved");
  });

  it("handles LEDGER_EXPORT_ACCOUNTING_PERIOD_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_RESP`,
      payload: {
        data: {
          exportAccountingPeriod: {
            exportJob: { accountingPeriodId: "1", format: "CSV", status: "in_progress" }
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.exportJobs.byPeriodId["1"]).toBeDefined();
    expect(state.exportJobs.byPeriodId["1"].status).toBe("in_progress");
  });

  it("handles LEDGER_EXPORT_SEQUENCES_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.EXPORT_SEQUENCES}_RESP`,
      payload: {
        data: {
          exportSequences: { accountingPeriodId: "1", format: "CSV", status: "complete", downloadUrl: "http://example.com/export.csv" }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.exportJobs.byPeriodId["1"]).toBeDefined();
    expect(state.exportJobs.byPeriodId["1"].status).toBe("complete");
    expect(state.exportJobs.byPeriodId["1"].downloadUrl).toBe("http://example.com/export.csv");
  });

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_REQ", () => {
    const action = { type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_REQ` };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.isFetching).toBe(true);
    expect(state.externalSystems.isFetching).toBe(true);
    expect(state.currencyCodes.isFetching).toBe(true);
    expect(state.chartOfAccounts.isFetching).toBe(true);
  });

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: {
        data: {
          deploymentConfiguration: { operatingMode: "single" },
          externalSystems: [{ code: "SYS1", label: "System 1" }],
          currencyCodes: [{ code: "USD", label: "USD" }],
          chartOfAccounts: [{ id: "QWNjb3VudGluZ1BlcmlvZDox", code: "4010", name: "Revenue" }]
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.isFetching).toBe(false);
    expect(state.deploymentConfiguration.isFetched).toBe(true);
    expect(state.deploymentConfiguration.data.operatingMode).toBe("single");
    expect(state.externalSystems.items.length).toBe(1);
    expect(state.currencyCodes.items.length).toBe(1);
    expect(state.chartOfAccounts.items.length).toBe(1);
    expect(state.chartOfAccounts.items[0].id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
  });

  it("handles LEDGER_CONFIGURE_DEPLOYMENT_REQ", () => {
    const action = { type: `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_REQ` };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(true);
    expect(state.deploymentConfiguration.error).toBe(null);
  });

  it("handles LEDGER_CONFIGURE_DEPLOYMENT_RESP", () => {
    const action = {
      type: `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_RESP`,
      payload: {
        data: {
          configureDeployment: {
            deploymentConfiguration: { operatingMode: "single", currencyCode: "USD" },
            errors: []
          }
        }
      }
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(false);
    expect(state.deploymentConfiguration.error).toBe(null);
    expect(state.deploymentConfiguration.data.operatingMode).toBe("single");
  });
});
