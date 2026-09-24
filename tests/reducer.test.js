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

  it("handles LEDGER_LEDGER_ENTRIES_RESP with the real transaction/legs connection", () => {
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
                  accountingPeriod: {
                    id: "QWNjb3VudGluZ1BlcmlvZDox",
                    code: "2026-07",
                    name: "Juillet 2026",
                    status: 1,
                  },
                  sourceEventType: "CLAIM_PAYMENT",
                  sourceEventReference: "CLM-2026-0001",
                  postedAt: "2026-07-24T10:00:00Z",
                  transaction: {
                    balance: "FCFA0",
                    legs: {
                      edges: [
                        {
                          node: {
                            id: "TGVnOjE=",
                            account: { code: "4010", name: "Debit" },
                            debit: "12500.00",
                            credit: "0",
                          },
                        },
                        {
                          node: {
                            id: "TGVnOjI=",
                            account: { code: "5120", name: "Cash" },
                            debit: "0",
                            credit: "12500.00",
                          },
                        },
                      ],
                    },
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
    expect(state.ledgerEntries.pageInfo).toEqual({
      totalCount: 10,
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "0",
      endCursor: "9",
    });
    const entry = state.ledgerEntries.items[0];
    expect(entry.id).toBe("1");
    expect(entry.accountingPeriod).toEqual({
      id: "1",
      code: "2026-07",
      name: "Juillet 2026",
      status: "open",
    });
    expect(entry.sourceEventType).toBe("claim_payment");
    expect(entry.lines).toEqual([
      {
        id: "1",
        account: { code: "4010", name: "Debit" },
        debit: "12500.00",
        credit: "0",
        partyTag: null,
        funderTag: null,
      },
      {
        id: "2",
        account: { code: "5120", name: "Cash" },
        debit: "0",
        credit: "12500.00",
        partyTag: null,
        funderTag: null,
      },
    ]);
    // Decimal strings coming from the backend must be summed as numbers.
    expect(entry.totals).toEqual({ debit: 12500, credit: 12500, balance: 0 });
  });

  it("maps analytic tags to party/funder tags and keeps the flat `lines` fallback", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: {
        data: {
          ledgerEntries: {
            totalCount: 1,
            pageInfo: {},
            edges: [
              {
                node: {
                  id: "TGVkZ2VyRW50cnk6Mg==",
                  lines: [
                    {
                      id: "TGVnOjM=",
                      account: { code: "4010", name: "Debit" },
                      debit: 100,
                      credit: null,
                      analyticTags: [
                        {
                          analyticValue: {
                            id: "QW5hbHl0aWNWYWx1ZTox",
                            displayName: "District Hospital",
                            axis: { code: "party" },
                          },
                        },
                        {
                          analyticValue: {
                            id: "QW5hbHl0aWNWYWx1ZToy",
                            displayName: "GIZ",
                            axis: { code: "funder" },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    const entry = state.ledgerEntries.items[0];
    expect(entry.lines).toHaveLength(1);
    expect(entry.lines[0].partyTag).toEqual({
      analyticValueId: "QW5hbHl0aWNWYWx1ZTox",
      displayName: "District Hospital",
    });
    expect(entry.lines[0].funderTag).toEqual({ analyticValueId: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ" });
    expect(entry.totals).toEqual({ debit: 100, credit: 0, balance: 100 });
  });

  it("reports the entry-level party/funder on every leg of the expandable detail", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_RESP`,
      payload: {
        data: {
          ledgerEntries: {
            totalCount: 1,
            pageInfo: {},
            edges: [
              {
                node: {
                  id: "TGVkZ2VyRW50cnk6Mw==",
                  party: { id: "QW5hbHl0aWNWYWx1ZTox", displayName: "District Hospital" },
                  funder: { id: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ" },
                  transaction: {
                    balance: "FCFA0",
                    legs: {
                      edges: [
                        {
                          node: {
                            id: "TGVnOjQ=",
                            account: { id: "QWNjb3VudDox", code: "4010", name: "Debit" },
                            debit: "1000.00",
                            credit: "0",
                          },
                        },
                        {
                          node: {
                            id: "TGVnOjU=",
                            account: { id: "QWNjb3VudDoy", code: "5120", name: "Cash" },
                            debit: "0",
                            credit: "1000.00",
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    const entry = state.ledgerEntries.items[0];
    expect(entry.lines.map((line) => line.account)).toEqual([
      { id: "QWNjb3VudDox", code: "4010", name: "Debit" },
      { id: "QWNjb3VudDoy", code: "5120", name: "Cash" },
    ]);
    expect(entry.lines.map((line) => line.partyTag)).toEqual([
      { analyticValueId: "QW5hbHl0aWNWYWx1ZTox", displayName: "District Hospital" },
      { analyticValueId: "QW5hbHl0aWNWYWx1ZTox", displayName: "District Hospital" },
    ]);
    expect(entry.lines.map((line) => line.funderTag)).toEqual([
      { analyticValueId: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ" },
      { analyticValueId: "QW5hbHl0aWNWYWx1ZToy", displayName: "GIZ" },
    ]);
  });

  it("handles LEDGER_LEDGER_ENTRIES_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.LEDGER_ENTRIES}_ERR`,
      payload: { message: "Network error" },
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
              {
                node: {
                  id: "QW5hbHl0aWNWYWx1ZTox",
                  displayName: "Party A",
                  partyType: "health_facility",
                  funderCode: null,
                  externalReference: "HF-1",
                },
              },
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
      payload: { message: "Search failed" },
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
            totalCount: 1,
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            edges: [
              {
                node: {
                  id: "balance-1",
                  accountingPeriod: { code: "2026-07" },
                  analyticValue: { displayName: "District Hospital" },
                  debitAmount: 1000,
                  creditAmount: 500,
                  balanceAmount: 500,
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.partyLedgerBalance.isFetching).toBe(false);
    expect(state.partyLedgerBalance.isFetched).toBe(true);
    expect(state.partyLedgerBalance.items).toHaveLength(1);
    expect(state.partyLedgerBalance.items[0].balanceAmount).toBe(500);
    expect(state.partyLedgerBalance.pageInfo.totalCount).toBe(1);
  });

  it("handles LEDGER_PARTY_LEDGER_BALANCE_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_ERR`,
      payload: { message: "Balance failed" },
    };
    const state = reducer(initialState, action);
    expect(state.partyLedgerBalance.isFetching).toBe(false);
    expect(state.partyLedgerBalance.error.message).toBe("Balance failed");
  });

  it("handles LEDGER_PARTY_LEDGER_BALANCE_RESET", () => {
    const withData = reducer(initialState, {
      type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE}_RESP`,
      payload: { data: { partyLedgerBalance: { totalCount: 0, edges: [], pageInfo: {} } } },
    });
    const state = reducer(withData, { type: `${ACTION_TYPE.PARTY_LEDGER_BALANCE_RESET}` });
    expect(state.partyLedgerBalance).toEqual({
      isFetching: false,
      isFetched: false,
      error: null,
      items: [],
      pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    });
  });

  it("handles LEDGER_FUNDER_SEARCH_RESP (analyticValue connection)", () => {
    const action = {
      type: `${ACTION_TYPE.FUNDER_SEARCH}_RESP`,
      payload: {
        data: {
          analyticValue: {
            edges: [
              {
                node: {
                  id: "QW5hbHl0aWNWYWx1ZToy",
                  displayName: "Funder A",
                  partyType: null,
                  funderCode: "GIZ",
                  externalReference: "GIZ",
                },
              },
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
            balance: 1000,
          },
        },
      },
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
      payload: { message: "Search failed" },
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
      payload: { message: "Report failed" },
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
            accountingPeriod: {
              id: "QWNjb3VudGluZ1BlcmlvZDox",
              startDate: "2026-08-01",
              endDate: "2026-08-31",
              status: "open",
            },
            errors: [],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.periodMutation.submitting).toBe(false);
    expect(state.periodMutation.error).toBe(null);
    expect(state.accountingPeriods.items.length).toBe(1);
  });

  it("handles LEDGER_OPEN_ACCOUNTING_PERIOD_ERR with a string error message", () => {
    const action = {
      type: `${ACTION_TYPE.OPEN_ACCOUNTING_PERIOD}_ERR`,
      payload: { message: "Network error" },
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
            errors: [{ field: "startDate", message: "Invalid date" }],
          },
        },
      },
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
          manualReviewQueue: {
            totalCount: 1,
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            edges: [
              {
                node: {
                  id: "item-1",
                  createdAt: "2026-07-01T10:00:00Z",
                  resolvedAt: null,
                  resolutionNote: null,
                  resolvedByTransaction: null,
                  replicationRecord: { status: "PENDING", targetSystem: "ODOO", rejectionReason: "boom" },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.manualReviewQueue.isFetching).toBe(false);
    expect(state.manualReviewQueue.isFetched).toBe(true);
    expect(state.manualReviewQueue.items).toHaveLength(1);
    expect(state.manualReviewQueue.items[0]).toMatchObject({
      id: "item-1",
      status: "PENDING",
      targetSystem: "ODOO",
      rejectionReason: "boom",
    });
  });

  it("handles LEDGER_RESOLVE_MANUAL_REVIEW_ITEM_RESP", () => {
    const initialStateWithItem = {
      ...initialState,
      manualReviewQueue: {
        ...initialState.manualReviewQueue,
        items: [{ id: "1", status: "pending" }],
      },
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
              resolutionNote: "Corrected",
            },
            errors: [],
          },
        },
      },
    };
    const state = reducer(initialStateWithItem, action);
    expect(state.reviewResolution.submitting).toBe(false);
    expect(state.reviewResolution.error).toBe(null);
    expect(state.manualReviewQueue.items[0].status).toBe("resolved");
  });

  it("maps the GraphQL node returned by the backend instead of merging it raw", () => {
    const initialStateWithItem = {
      ...initialState,
      manualReviewQueue: {
        ...initialState.manualReviewQueue,
        items: [{ id: "item-1", status: "PENDING", correctingEntryId: null }],
      },
    };
    const action = {
      type: `${ACTION_TYPE.RESOLVE_MANUAL_REVIEW_ITEM}_RESP`,
      payload: {
        data: {
          resolveManualReviewItem: {
            manualReviewQueueItem: {
              id: "item-1",
              resolvedAt: "2026-07-31T10:00:00Z",
              resolutionNote: "Corrected",
              resolvedByTransaction: { id: "txn-42" },
              replicationRecord: {
                status: "SUCCEEDED",
                targetSystem: "odoo",
                rejectionReason: null,
                externalReference: "REF-1",
                ledgerEntry: null,
              },
            },
            errors: [],
          },
        },
      },
    };
    const state = reducer(initialStateWithItem, action);

    // The raw node field names must not leak into the view-model.
    expect(state.manualReviewQueue.items[0]).toMatchObject({
      id: "item-1",
      status: "SUCCEEDED",
      correctingEntryId: "txn-42",
      resolutionNote: "Corrected",
    });
    expect(state.manualReviewQueue.items[0].resolvedByTransaction).toBeUndefined();
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

  it("handles LEDGER_EXPORT_PERIOD_REGISTER_REQ/RESP/ERR", () => {
    const requested = reducer(initialState, { type: `${ACTION_TYPE.EXPORT_PERIOD_REGISTER}_REQ` });
    expect(requested.exportDownload.isFetching).toBe(true);
    expect(requested.exportDownload.error).toBe(null);

    const succeeded = reducer(requested, {
      type: `${ACTION_TYPE.EXPORT_PERIOD_REGISTER}_RESP`,
      payload: { filename: "FEC_2026-05.csv" },
    });
    expect(succeeded.exportDownload.isFetching).toBe(false);
    expect(succeeded.exportDownload.error).toBe(null);

    const failed = reducer(requested, {
      type: `${ACTION_TYPE.EXPORT_PERIOD_REGISTER}_ERR`,
      payload: { message: "ledger.export.errors.forbidden" },
    });
    expect(failed.exportDownload.isFetching).toBe(false);
    expect(failed.exportDownload.error).toBe("ledger.export.errors.forbidden");
  });

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_REQ", () => {
    const action = { type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_REQ` };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.isFetching).toBe(true);
    expect(state.deploymentConfiguration.isFetched).toBe(false);
  });

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_RESP and maps enum names back to stored values", () => {
    const action = {
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: {
        data: {
          deploymentConfiguration: {
            totalCount: 1,
            edges: [
              {
                node: {
                  id: "Q29uZmlnOjE=",
                  operatingMode: "LOCAL_ONLY",
                  externalSystem: "ODOO",
                  currencyCode: "XAF",
                  retainedEarningsAccount: { id: "QWNjb3VudDox", uuid: "uuid-1", code: "1200", name: "Reserves" },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.isFetching).toBe(false);
    expect(state.deploymentConfiguration.isFetched).toBe(true);
    expect(state.deploymentConfiguration.error).toBe(null);
    expect(state.deploymentConfiguration.data.operatingMode).toBe("local_only");
    expect(state.deploymentConfiguration.data.externalSystem).toBe("odoo");
    expect(state.deploymentConfiguration.data.currencyCode).toBe("XAF");
    expect(state.deploymentConfiguration.data.retainedEarningsAccount.uuid).toBe("uuid-1");
  });

  it("keeps a null externalSystem when the configuration is not replicated", () => {
    const action = {
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: {
        data: {
          deploymentConfiguration: { edges: [{ node: { operatingMode: "REPLICATED", externalSystem: null } }] },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.data.operatingMode).toBe("replicated");
    expect(state.deploymentConfiguration.data.externalSystem).toBe(null);
  });

  it("handles LEDGER_DEPLOYMENT_CONFIGURATION_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.DEPLOYMENT_CONFIGURATION}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.error).toBe("Network error");
    expect(state.deploymentConfiguration.isFetching).toBe(false);
  });

  it("handles LEDGER_ACCOUNT_OPTIONS_REQ", () => {
    const action = { type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_REQ` };
    const state = reducer(initialState, action);
    expect(state.accountOptions.isFetching).toBe(true);
    expect(state.accountOptions.isFetched).toBe(false);
  });

  it("handles LEDGER_ACCOUNT_OPTIONS_RESP and decodes the relay ids", () => {
    const action = {
      type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_RESP`,
      payload: {
        data: {
          accounts: {
            totalCount: 1,
            edges: [
              {
                node: {
                  id: btoa("AccountType:uuid-1"),
                  uuid: "uuid-1",
                  code: "1200",
                  name: "Reserves",
                  type: "EQ",
                  currencies: '["XAF"]',
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.accountOptions.isFetched).toBe(true);
    expect(state.accountOptions.items).toHaveLength(1);
    expect(state.accountOptions.items[0].id).toBe("uuid-1");
    expect(state.accountOptions.items[0].uuid).toBe("uuid-1");
  });

  it("handles LEDGER_ACCOUNT_OPTIONS_ERR", () => {
    const action = { type: `${ACTION_TYPE.ACCOUNT_OPTIONS}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.accountOptions.error).toBe("Network error");
  });

  it("handles LEDGER_CREATE_DEPLOYMENT_CONFIGURATION_REQ", () => {
    const action = { type: `${ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION}_REQ` };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(true);
    expect(state.deploymentConfiguration.error).toBe(null);
  });

  it("handles LEDGER_CREATE_DEPLOYMENT_CONFIGURATION_RESP with the submitted values", () => {
    const retainedEarningsAccount = { id: "AccountType:uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves" };
    const action = {
      type: `${ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: { data: { createDeploymentConfiguration: { internalId: "1", clientMutationId: "cid" } } },
      meta: {
        deploymentConfiguration: {
          operatingMode: "replicated",
          externalSystem: "sage",
          currencyCode: "EUR",
          retainedEarningsAccount,
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(false);
    expect(state.deploymentConfiguration.error).toBe(null);
    expect(state.deploymentConfiguration.data).toMatchObject({
      operatingMode: "replicated",
      externalSystem: "sage",
      currencyCode: "EUR",
    });
    expect(state.deploymentConfiguration.data.retainedEarningsAccount).toEqual(retainedEarningsAccount);
  });

  it("handles LEDGER_CREATE_DEPLOYMENT_CONFIGURATION_RESP backend errors", () => {
    const action = {
      type: `${ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION}_RESP`,
      payload: {
        data: {
          createDeploymentConfiguration: {
            internalId: null,
            errors: [
              {
                field: "retainedEarningsAccountId",
                message: "retained earnings account type should not be income / expense",
              },
            ],
          },
        },
      },
      meta: { deploymentConfiguration: { operatingMode: "local_only" } },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(false);
    expect(state.deploymentConfiguration.error).toBe("retained earnings account type should not be income / expense");
  });

  it("handles LEDGER_CREATE_DEPLOYMENT_CONFIGURATION_ERR", () => {
    const action = {
      type: `${ACTION_TYPE.CREATE_DEPLOYMENT_CONFIGURATION}_ERR`,
      payload: { message: "Network error" },
    };
    const state = reducer(initialState, action);
    expect(state.deploymentConfiguration.submitting).toBe(false);
    expect(state.deploymentConfiguration.error).toBe("Network error");
  });
});
