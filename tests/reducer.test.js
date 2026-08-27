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

  it("handles LEDGER_LEDGER_ENTRIES_RESP with the real transaction/legs shape", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: {
        data: {
          ledgerEntries: {
            totalCount: 10,
            pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: "0", endCursor: "9" },
            edges: [
              {
                node: {
                  id: "TGVkZ2VyRW50cnk6MQ==",
                  journal: { code: "BANK", name: "Bank" },
                  accountingPeriod: { id: "QWNjb3VudGluZ1BlcmlvZDox", status: 1 },
                  sourceEventType: "claim_payment",
                  sourceEventReference: "CLM-2026-0001",
                  postedAt: "2026-07-24T10:00:00Z",
                  transaction: {
                    id: "VHJhbnNhY3Rpb246MQ==",
                    legs: [
                      {
                        id: "TGVnOjE=",
                        account: { code: "4010", name: "Debit" },
                        debit: "12500.00",
                        credit: null,
                        analyticTags: [
                          { analyticValue: { id: "QW5hbHl0aWNWYWx1ZTox", displayName: "District Hospital", partyType: "health_facility", funderCode: null, axis: { code: "party" } } },
                          { analyticValue: { id: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ", partyType: null, funderCode: "GIZ", axis: { code: "funder" } } },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.ledgerEntries.isFetching).toBe(false);
    expect(state.ledgerEntries.isFetched).toBe(true);
    expect(state.ledgerEntries.items.length).toBe(1);
    expect(state.ledgerEntries.pageInfo.totalCount).toBe(10);
    const entry = state.ledgerEntries.items[0];
    expect(entry.id).toBe("1");
    expect(entry.accountingPeriod.status).toBe("open");
    expect(entry.sourceEventType).toBe("claim_payment");
    expect(entry.lines).toHaveLength(1);
    expect(entry.lines[0].partyTag).toEqual({ analyticValueId: "QW5hbHl0aWNWYWx1ZTox", displayName: "District Hospital" });
    expect(entry.lines[0].funderTag).toEqual({ analyticValueId: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ" });
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

  it("handles LEDGER_ACCOUNTING_PERIODS_RESP (Relay connection, status normalized)", () => {
    const action = {
      type: `${ACTION_TYPE.ACCOUNTING_PERIODS}_RESP`,
      payload: {
        data: {
          accountingPeriods: {
            totalCount: 1,
            edges: [
              {
                node: {
                  id: "QWNjb3VudGluZ1BlcmlvZDox",
                  startDate: "2026-07-01",
                  endDate: "2026-07-31",
                  code: "2026-07",
                  status: 1,
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.accountingPeriods.isFetching).toBe(false);
    expect(state.accountingPeriods.isFetched).toBe(true);
    expect(state.accountingPeriods.items.length).toBe(1);
    expect(state.accountingPeriods.items[0].id).toBe("QWNjb3VudGluZ1BlcmlvZDox");
    expect(state.accountingPeriods.items[0].status).toBe("open");
    expect(state.accountingPeriods.items[0].code).toBe("2026-07");
  });

  it("handles LEDGER_PARTY_SEARCH_REQ", () => {
    const action = { type: `${ACTION_TYPE.PARTY_SEARCH}_REQ` };
    const state = reducer(initialState, action);
    expect(state.partySearch.isFetching).toBe(true);
  });

  it("handles LEDGER_PARTY_SEARCH_RESP (analyticValue connection)", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_SEARCH}_RESP`,
      payload: {
        data: {
          analyticValue: {
            edges: [
              { node: { id: "QW5hbHl0aWNWYWx1ZTox", displayName: "Party A", partyType: "health_facility", funderCode: null, externalReference: "HF-1" } },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.partySearch.isFetching).toBe(false);
    expect(state.partySearch.isFetched).toBe(true);
    expect(state.partySearch.results.length).toBe(1);
    expect(state.partySearch.results[0].analyticValueId).toBe("QW5hbHl0aWNWYWx1ZTox");
    expect(state.partySearch.results[0].id).toBe("QW5hbHl0aWNWYWx1ZTox");
    expect(state.partySearch.results[0].partyType).toBe("health_facility");
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

  it("handles LEDGER_PARTY_LEDGER_BALANCE_RESET", () => {
    const withData = reducer(initialState, {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
      payload: { data: { partyLedgerBalance: { balance: 500, transactions: [] } } },
    });
    const state = reducer(withData, { type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET}` });
    expect(state.partyLedgerBalance).toEqual({ isFetching: false, isFetched: false, error: null, data: null });
  });

  it("handles LEDGER_FUNDER_SEARCH_RESP (analyticValue connection)", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
      payload: {
        data: {
          analyticValue: {
            edges: [
              { node: { id: "QW5hbHl0aWNWYWx1ZToy", displayName: "Funder A", partyType: null, funderCode: "GIZ", externalReference: "GIZ" } },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.funderSearch.isFetching).toBe(false);
    expect(state.funderSearch.isFetched).toBe(true);
    expect(state.funderSearch.results.length).toBe(1);
    expect(state.funderSearch.results[0].analyticValueId).toBe("QW5hbHl0aWNWYWx1ZToy");
    expect(state.funderSearch.results[0].id).toBe("QW5hbHl0aWNWYWx1ZToy");
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

  it("handles LEDGER_FUNDER_SEARCH_REQ", () => {
    const action = { type: `${ACTION_TYPE.FUNDER_SEARCH}_REQ` };
    const state = reducer(initialState, action);
    expect(state.funderSearch.isFetching).toBe(true);
    expect(state.funderSearch.isFetched).toBe(false);
    expect(state.funderSearch.error).toBe(null);
  });

  it("handles LEDGER_FUNDER_SEARCH_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_SEARCH}_ERR`,
      payload: { message: "Search failed" }
    };
    const state = reducer(initialState, action);
    expect(state.funderSearch.isFetching).toBe(false);
    expect(state.funderSearch.error.message).toBe("Search failed");
  });

  it("handles LEDGER_FUNDER_ACTIVITY_REPORT_REQ", () => {
    const action = { type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_REQ` };
    const state = reducer(initialState, action);
    expect(state.funderActivityReport.isFetching).toBe(true);
    expect(state.funderActivityReport.isFetched).toBe(false);
    expect(state.funderActivityReport.error).toBe(null);
  });

  it("handles LEDGER_FUNDER_ACTIVITY_REPORT_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_ACTIVITY_REPORT}_ERR`,
      payload: { message: "Report failed" }
    };
    const state = reducer(initialState, action);
    expect(state.funderActivityReport.isFetching).toBe(false);
    expect(state.funderActivityReport.error.message).toBe("Report failed");
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

  it("handles LEDGER_OPEN_ACCOUNTING_PERIOD_ERR with a string error message", () => {
    const action = {
      type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_ERR`,
      payload: { message: "Network error" }
    };
    const state = reducer(initialState, action);
    expect(state.periodMutation.submitting).toBe(false);
    expect(state.periodMutation.error).toBe("Network error");
    expect(state.periodMutation.lastRejectionReason).toBe(null);
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

  it("handles LEDGER_RESOLVE_MANUAL_REVIEW_ITEM_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.reviewResolution.submitting).toBe(false);
    expect(state.reviewResolution.error).toBe("Network error");
  });

  it("handles LEDGER_RESOLVE_MANUAL_REVIEW_ITEM_ERR without a message", () => {
    const action = {
      type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_ERR`,
      payload: null,
    };
    const state = reducer(initialState, action);
    expect(state.reviewResolution.submitting).toBe(false);
    expect(state.reviewResolution.error).toBe(null);
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

  it("handles LEDGER_EXPORT_ACCOUNTING_PERIOD_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.EXPORT_ACCOUNTING_PERIOD}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.exportJobs.error).toBe("Network error");
  });

  it("handles LEDGER_EXPORT_SEQUENCES_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.EXPORT_SEQUENCES}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.exportJobs.error).toBe("Network error");
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

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.error).toBe("Network error");
    expect(state.externalSystems.error).toBe("Network error");
  });

  it("handles LEDGER_CONFIGURE_DEPLOYMENT_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.CONFIGURE_DEPLOYMENT}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(false);
    expect(state.deploymentConfiguration.error).toBe("Network error");
  });
});
