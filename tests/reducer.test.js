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

  // Kept from develop: the entry-level party/funder is inherited by every
  // leg that carries no analytic tag of its own.
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
            exportJob: { accountingPeriodId: "1", format: "CSV", status: "in_progress" },
          },
        },
      },
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
          exportSequences: {
            accountingPeriodId: "1",
            format: "CSV",
            status: "complete",
            downloadUrl: "http://example.com/export.csv",
          },
        },
      },
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

  it("handles LEDGER_JOURNALS_REQ", () => {
    const action = { type: `${ACTION_TYPE.JOURNALS}_REQ` };
    const state = reducer(initialState, action);
    expect(state.journals.isFetching).toBe(true);
    expect(state.journals.isFetched).toBe(false);
  });

  it("handles LEDGER_JOURNALS_RESP with the page info and the journal nodes", () => {
    const action = {
      type: `${ACTION_TYPE.JOURNALS}_RESP`,
      payload: {
        data: {
          ledgerJournal: {
            totalCount: 3,
            pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: "c1", endCursor: "c2" },
            edges: [
              {
                node: {
                  id: "journal-1",
                  name: "Bank",
                  code: "BANK",
                  type: { id: "uuid-2", code: "bank", type: "Bank & Checks Journal" },
                  defaultDebitAccountId: { id: "acc-1", uuid: "acc-1", code: "5120", name: "Banque" },
                  defaultCreditAccountId: { id: "acc-2", uuid: "acc-2", code: "7010", name: "Ventes" },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.journals.isFetched).toBe(true);
    expect(state.journals.items).toHaveLength(1);
    expect(state.journals.items[0].type.code).toBe("bank");
    expect(state.journals.pageInfo).toEqual({
      totalCount: 3,
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "c1",
      endCursor: "c2",
    });
  });

  it("handles LEDGER_JOURNALS_ERR", () => {
    const action = { type: `${ACTION_TYPE.JOURNALS}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.journals.error).toBe("Network error");
  });

  it("tracks the pending journal mutation for the JournalDrawer", () => {
    const requested = reducer(initialState, {
      type: `${ACTION_TYPE.CREATE_JOURNAL}_REQ`,
      meta: { clientMutationId: "cid-1", clientMutationLabel: "Pending", requestedDateTime: new Date() },
    });
    expect(requested.submittingMutation).toBe(true);
    expect(requested.mutation).toMatchObject({
      clientMutationId: "cid-1",
      clientMutationLabel: "Pending",
      id: "cid-1",
    });

    const succeeded = reducer(requested, {
      type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`,
      payload: { data: { createJournal: { internalId: "internal-1" } } },
    });
    expect(succeeded.submittingMutation).toBe(false);
    expect(succeeded.mutation.id).toBe("internal-1");
  });

  it("handles LEDGER_UPDATE_JOURNAL_REQ/RESP", () => {
    const requested = reducer(initialState, { type: `${ACTION_TYPE.UPDATE_JOURNAL}_REQ` });
    expect(requested.journalMutation.submitting).toBe(true);

    const state = reducer(initialState, {
      type: `${ACTION_TYPE.UPDATE_JOURNAL}_RESP`,
      payload: { data: { updateJournal: { internalId: "1", clientMutationId: "cid" } } },
    });
    expect(state.journalMutation.submitting).toBe(false);
    expect(state.journalMutation.error).toBe(null);
    expect(state.journalMutation.lastMutationAt).toEqual(expect.any(Number));
  });

  it("handles LEDGER_DELETE_JOURNAL_REQ/RESP/ERR", () => {
    const requested = reducer(initialState, { type: `${ACTION_TYPE.DELETE_JOURNAL}_REQ` });
    expect(requested.journalMutation.submitting).toBe(true);

    const succeeded = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_JOURNAL}_RESP`,
      payload: { data: { deleteJournal: { internalId: "1", clientMutationId: "cid" } } },
    });
    expect(succeeded.journalMutation.error).toBe(null);
    expect(succeeded.journalMutation.lastMutationAt).toEqual(expect.any(Number));

    const failed = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_JOURNAL}_RESP`,
      payload: {
        data: {
          deleteJournal: {
            internalId: null,
            errors: [{ field: "journalUuid", message: "Journal is used by 12 entries" }],
          },
        },
      },
    });
    expect(failed.journalMutation.error).toBe("Journal is used by 12 entries");
    expect(failed.journalMutation.lastMutationAt).toBe(null);

    const networkError = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_JOURNAL}_ERR`,
      payload: { message: "Network error" },
    });
    expect(networkError.journalMutation.error).toBe("Network error");
  });

  it("decodes the journal and journal type relay ids for the mutations", () => {
    const action = {
      type: `${ACTION_TYPE.JOURNALS}_RESP`,
      payload: {
        data: {
          ledgerJournal: {
            totalCount: 1,
            edges: [
              {
                node: {
                  id: btoa("LedgerJournalGQLType:01a0aa32-c518-756c-95f6-fd27165e353e"),
                  name: "Bank",
                  code: "BANK",
                  isDeleted: false,
                  type: {
                    id: btoa("JournalTypeGQLType:20bdc1ce-2c79-4464-bc66-03b857125b7f"),
                    code: "bank",
                  },
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.journals.items[0].id).toBe("01a0aa32-c518-756c-95f6-fd27165e353e");
    expect(state.journals.items[0].type.id).toBe("20bdc1ce-2c79-4464-bc66-03b857125b7f");
  });

  it("hides journals flagged as deleted until the backend filters them", () => {
    const action = {
      type: `${ACTION_TYPE.JOURNALS}_RESP`,
      payload: {
        data: {
          ledgerJournal: {
            totalCount: 2,
            edges: [
              { node: { id: "journal-1", code: "BANK", name: "Bank", isDeleted: false } },
              { node: { id: "journal-2", code: "OLD", name: "Old", isDeleted: true } },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.journals.items).toHaveLength(1);
    expect(state.journals.items[0].id).toBe("journal-1");
  });

  it("handles LEDGER_JOURNAL_TYPES_RESP decoding the relay ids for the mutation", () => {
    const action = {
      type: `${ACTION_TYPE.JOURNAL_TYPES}_RESP`,
      payload: {
        data: {
          journalTypes: {
            totalCount: 1,
            edges: [
              { node: { id: btoa("JournalTypeGQLType:uuid-2"), code: "bank", type: "Bank", altLanguage: "Banque" } },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.journalTypes.isFetched).toBe(true);
    expect(state.journalTypes.items[0]).toMatchObject({ id: "uuid-2", code: "bank", altLanguage: "Banque" });
  });

  it("handles LEDGER_JOURNAL_TYPES_ERR", () => {
    const action = { type: `${ACTION_TYPE.JOURNAL_TYPES}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.journalTypes.error).toBe("Network error");
  });

  it("handles LEDGER_CREATE_JOURNAL_RESP by stamping the mutation time", () => {
    const action = { type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`, payload: { data: { createJournal: {} } } };
    const state = reducer(initialState, action);
    expect(state.journalMutation.submitting).toBe(false);
    expect(state.journalMutation.error).toBe(null);
    expect(state.journalMutation.lastMutationAt).toEqual(expect.any(Number));
  });

  it("handles LEDGER_CREATE_JOURNAL_RESP backend errors", () => {
    const action = {
      type: `${ACTION_TYPE.CREATE_JOURNAL}_RESP`,
      payload: {
        data: {
          createJournal: { errors: [{ field: "code", message: "The specified journal type was not found" }] },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.journalMutation.error).toBe("The specified journal type was not found");
    expect(state.journalMutation.lastMutationAt).toBe(null);
  });

  it("handles LEDGER_CREATE_JOURNAL_ERR", () => {
    const action = { type: `${ACTION_TYPE.CREATE_JOURNAL}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.journalMutation.submitting).toBe(false);
    expect(state.journalMutation.error).toBe("Network error");
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

  it("handles LEDGER_ACCOUNTS_REQ", () => {
    const action = { type: `${ACTION_TYPE.ACCOUNTS}_REQ` };
    const state = reducer(initialState, action);
    expect(state.accounts.isFetching).toBe(true);
    expect(state.accounts.isFetched).toBe(false);
  });

  it("handles LEDGER_ACCOUNTS_RESP with the page info and parsed currencies", () => {
    const action = {
      type: `${ACTION_TYPE.ACCOUNTS}_RESP`,
      payload: {
        data: {
          accounts: {
            totalCount: 12,
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
              startCursor: "cursor-1",
              endCursor: "cursor-2",
            },
            edges: [
              {
                node: {
                  id: btoa("AccountType:uuid-1"),
                  uuid: "uuid-1",
                  name: "Reserves",
                  code: "1200",
                  fullCode: "1200",
                  type: "EQ",
                  isBankAccount: false,
                  currencies: '["XAF","EUR"]',
                  level: 1,
                },
              },
            ],
          },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.accounts.isFetching).toBe(false);
    expect(state.accounts.isFetched).toBe(true);
    expect(state.accounts.error).toBe(null);
    expect(state.accounts.items).toHaveLength(1);
    expect(state.accounts.items[0]).toMatchObject({
      id: "uuid-1",
      uuid: "uuid-1",
      code: "1200",
      type: "EQ",
      currencies: ["XAF", "EUR"],
    });
    expect(state.accounts.pageInfo).toEqual({
      totalCount: 12,
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "cursor-1",
      endCursor: "cursor-2",
    });
  });

  it("handles LEDGER_ACCOUNTS_ERR", () => {
    const action = { type: `${ACTION_TYPE.ACCOUNTS}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.accounts.isFetching).toBe(false);
    expect(state.accounts.error).toBe("Network error");
  });

  it("handles LEDGER_CREATE_ACCOUNT_REQ", () => {
    const action = { type: `${ACTION_TYPE.CREATE_ACCOUNT}_REQ` };
    const state = reducer(initialState, action);
    expect(state.accountMutation.submitting).toBe(true);
    expect(state.accountMutation.error).toBe(null);
  });

  it("handles LEDGER_CREATE_ACCOUNT_RESP by stamping the mutation time", () => {
    const action = {
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`,
      payload: { data: { createAccount: { internalId: "1", clientMutationId: "cid" } } },
    };
    const state = reducer(initialState, action);
    expect(state.accountMutation.submitting).toBe(false);
    expect(state.accountMutation.error).toBe(null);
    expect(state.accountMutation.lastMutationAt).toEqual(expect.any(Number));
  });

  it("handles LEDGER_CREATE_ACCOUNT_RESP backend errors", () => {
    const action = {
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`,
      payload: {
        data: {
          createAccount: { internalId: null, errors: [{ field: "code", message: "The code is already used" }] },
        },
      },
    };
    const state = reducer(initialState, action);
    expect(state.accountMutation.submitting).toBe(false);
    expect(state.accountMutation.error).toBe("The code is already used");
    expect(state.accountMutation.lastMutationAt).toBe(null);
  });

  it("handles LEDGER_CREATE_ACCOUNT_ERR", () => {
    const action = { type: `${ACTION_TYPE.CREATE_ACCOUNT}_ERR`, payload: { message: "Network error" } };
    const state = reducer(initialState, action);
    expect(state.accountMutation.submitting).toBe(false);
    expect(state.accountMutation.error).toBe("Network error");
  });

  it("tracks the pending account mutation for the JournalDrawer", () => {
    const requested = reducer(initialState, {
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_REQ`,
      meta: { clientMutationId: "cid-1", clientMutationLabel: "Pending", requestedDateTime: new Date() },
    });
    expect(requested.submittingMutation).toBe(true);
    expect(requested.mutation).toMatchObject({
      clientMutationId: "cid-1",
      clientMutationLabel: "Pending",
      id: "cid-1",
    });

    const succeeded = reducer(requested, {
      type: `${ACTION_TYPE.CREATE_ACCOUNT}_RESP`,
      payload: { data: { createAccount: { internalId: "internal-1" } } },
    });
    expect(succeeded.submittingMutation).toBe(false);
    expect(succeeded.mutation.id).toBe("internal-1");
  });

  it("handles LEDGER_UPDATE_ACCOUNT_REQ/RESP", () => {
    const requested = reducer(initialState, { type: `${ACTION_TYPE.UPDATE_ACCOUNT}_REQ` });
    expect(requested.accountMutation.submitting).toBe(true);

    const state = reducer(initialState, {
      type: `${ACTION_TYPE.UPDATE_ACCOUNT}_RESP`,
      payload: { data: { updateAccount: { internalId: "1", clientMutationId: "cid" } } },
    });
    expect(state.accountMutation.submitting).toBe(false);
    expect(state.accountMutation.error).toBe(null);
    expect(state.accountMutation.lastMutationAt).toEqual(expect.any(Number));
  });

  it("handles LEDGER_UPDATE_ACCOUNT_RESP backend errors", () => {
    const state = reducer(initialState, {
      type: `${ACTION_TYPE.UPDATE_ACCOUNT}_RESP`,
      payload: {
        data: {
          updateAccount: { internalId: null, errors: [{ field: "code", message: "The code is already used" }] },
        },
      },
    });
    expect(state.accountMutation.submitting).toBe(false);
    expect(state.accountMutation.error).toBe("The code is already used");
    expect(state.accountMutation.lastMutationAt).toBe(null);
  });

  it("handles LEDGER_DELETE_ACCOUNT_REQ/RESP/ERR", () => {
    const requested = reducer(initialState, { type: `${ACTION_TYPE.DELETE_ACCOUNT}_REQ` });
    expect(requested.accountMutation.submitting).toBe(true);

    const succeeded = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_ACCOUNT}_RESP`,
      payload: { data: { deleteAccount: { internalId: "1", clientMutationId: "cid" } } },
    });
    expect(succeeded.accountMutation.error).toBe(null);
    expect(succeeded.accountMutation.lastMutationAt).toEqual(expect.any(Number));

    const failed = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_ACCOUNT}_RESP`,
      payload: {
        data: {
          deleteAccount: {
            internalId: null,
            errors: [{ field: "accountUuid", message: "Account is used by 12 legs" }],
          },
        },
      },
    });
    expect(failed.accountMutation.error).toBe("Account is used by 12 legs");
    expect(failed.accountMutation.lastMutationAt).toBe(null);

    const networkError = reducer(initialState, {
      type: `${ACTION_TYPE.DELETE_ACCOUNT}_ERR`,
      payload: { message: "Network error" },
    });
    expect(networkError.accountMutation.error).toBe("Network error");
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
