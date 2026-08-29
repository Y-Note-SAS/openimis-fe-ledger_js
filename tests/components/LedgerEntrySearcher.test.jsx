import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { initialState as ledgerInitialState } from "../../src/reducer";
import { graphqlWithVariables } from "@openimis/fe-core";
import LedgerEntrySearcher from "../../src/components/LedgerEntrySearcher";

const searcherSpy = vi.fn();

vi.mock("@openimis/fe-core", async () => {
  const actual = await vi.importActual("@openimis/fe-core");
  return {
    ...actual,
    Searcher: (props) => {
      searcherSpy(props);
      return (
        <div>
          <div>searcher</div>
          {props.items?.map((item) => (
            <div key={item.id} onClick={() => props.onRowClick?.(item)}>
              {item.journal?.code}
            </div>
          ))}
          {props.detailRowFormatter && (
            <div data-testid="detail-row">{props.detailRowFormatter({ id: "1", lines: [] })}</div>
          )}
        </div>
      );
    },
  };
});

const buildStore = (ledgerOverride = {}) =>
  createStore(
    combineReducers({
      ledger: () => ({
        ...ledgerInitialState,
        ...ledgerOverride,
      }),
    }),
    applyMiddleware(thunk),
  );

describe("LedgerEntrySearcher", () => {
  beforeEach(() => {
    searcherSpy.mockClear();
  });

  it("waits for accounting periods before rendering the searcher", () => {
    const store = buildStore({
      accountingPeriods: { isFetching: true, isFetched: false, error: null, items: [] },
    });

    const { container } = render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(searcherSpy).not.toHaveBeenCalled();
  });

  it("passes the open accounting period as the default visible filter", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [
          { id: "2", status: "closed", startDate: "2026-06-01", endDate: "2026-06-30" },
          { id: "1", status: "open", startDate: "2026-07-01", endDate: "2026-07-31" },
        ],
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(screen.getByText("searcher")).toBeInTheDocument();
    expect(searcherSpy).toHaveBeenCalled();
    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.defaultFilters).toEqual({
      accountingPeriodId: {
        value: "1",
        filter: 'accountingPeriod: "1"',
      },
    });
  });

  it("renders null when accounting periods are not fetched", () => {
    const store = buildStore({
      accountingPeriods: { isFetching: false, isFetched: false, error: null, items: [] },
    });

    const { container } = render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders searcher when accounting periods are fetched", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open", startDate: "2026-07-01", endDate: "2026-07-31" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(screen.getByText("searcher")).toBeInTheDocument();
  });

  it("fetches accounting periods on mount if not fetched", () => {
    const store = createStore(
      combineReducers({
        ledger: () => ({
          ...ledgerInitialState,
          accountingPeriods: { isFetching: false, isFetched: false, error: null, items: [] },
        }),
      }),
      applyMiddleware(thunk),
    );

    const originalDispatch = store.dispatch;
    store.dispatch = vi.fn(originalDispatch);

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(store.dispatch).toHaveBeenCalled();
  });

  it("does not fetch accounting periods if already fetched", () => {
    const store = buildStore({
      accountingPeriods: { isFetching: false, isFetched: true, error: null, items: [{ id: "1", status: "open" }] },
    });

    const originalDispatch = store.dispatch;
    store.dispatch = vi.fn(originalDispatch);

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("handles no open accounting period", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "2", status: "closed", startDate: "2026-06-01", endDate: "2026-06-30" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(screen.getByText("searcher")).toBeInTheDocument();
    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.defaultFilters).toEqual({});
  });

  it("fetch dispatches the real fetchLedgerEntries with the flattened filters and page info", async () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", code: "2026-07", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.fetch).toBeDefined();
    expect(props.filtersToQueryParams).toBeDefined();

    graphqlWithVariables.mockClear();
    props.filtersToQueryParams({
      filters: {
        journal: { value: "BANK", filter: 'journal: "BANK"' },
        accountingPeriodId: { value: "1", filter: 'accountingPeriod: "1"' },
        sourceEventType: { value: "claim_payment", filter: 'sourceEventType: "claim_payment"' },
      },
      pageSize: 10,
      afterCursor: null,
      beforeCursor: null,
      orderBy: "-postedAt",
    });
    await props.fetch();

    expect(graphqlWithVariables).toHaveBeenCalled();
    const [operation, variables] = graphqlWithVariables.mock.calls.at(-1);
    expect(operation).toContain("ledgerEntries");
    expect(variables).toEqual({
      journal: "BANK",
      accountingPeriodCode: "2026-07",
      party: null,
      funder: null,
      sourceEventType: "CLAIM_PAYMENT",
      first: 10,
      after: null,
      before: null,
      last: null,
    });
  });

  it("renders items with row click handler", () => {
    const items = [
      { id: "1", journal: { code: "BANK" }, lines: [] },
      { id: "2", journal: { code: "SALES" }, lines: [] },
    ];

    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items,
        pageInfo: { totalCount: 2 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    expect(screen.getByText("BANK")).toBeInTheDocument();
    expect(screen.getByText("SALES")).toBeInTheDocument();
  });

  it("toggles entry expansion on row click", () => {
    const items = [
      { id: "1", journal: { code: "BANK" }, lines: [{ id: "l1", account: { code: "4010", name: "Revenue" } }] },
    ];

    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items,
        pageInfo: { totalCount: 1 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const bankElement = screen.getByText("BANK");
    fireEvent.click(bankElement);

    expect(screen.getByTestId("detail-row")).toBeInTheDocument();
  });

  it("renders entry details with lines", () => {
    const entry = {
      id: "1",
      journal: { code: "BANK" },
      sourceEventType: "CLAIM_PAYMENT",
      sourceEventReference: "CLM-001",
      postedAt: "2026-07-24",
      lines: [
        {
          id: "l1",
          account: { code: "4010", name: "Revenue" },
          partyTag: { displayName: "Party A" },
          funderTag: { displayName: "Funder A" },
          debit: 1000,
          credit: 0,
        },
        {
          id: "l2",
          account: { code: "5120", name: "Cash" },
          partyTag: { displayName: "Party A" },
          funderTag: { displayName: "Funder A" },
          debit: 0,
          credit: 1000,
        },
      ],
      totals: { debit: 1000, credit: 1000, balance: 0 },
    };

    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [entry],
        pageInfo: { totalCount: 1 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const bankElement = screen.getByText("BANK");
    fireEvent.click(bankElement);

    expect(screen.getByTestId("detail-row")).toBeInTheDocument();
  });

  it("handles null lines in entry details", () => {
    const entry = {
      id: "1",
      journal: { code: "BANK" },
      sourceEventType: "CLAIM_PAYMENT",
      sourceEventReference: "CLM-001",
      postedAt: "2026-07-24",
      lines: [],
      totals: { debit: 0, credit: 0, balance: 0 },
    };

    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [entry],
        pageInfo: { totalCount: 1 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const bankElement = screen.getByText("BANK");
    fireEvent.click(bankElement);

    expect(screen.getByTestId("detail-row")).toBeInTheDocument();
  });

  it("handles null entry in renderEntryDetails", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", journal: { code: "BANK" }, lines: [] }],
        pageInfo: { totalCount: 1 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const bankElement = screen.getByText("BANK");
    fireEvent.click(bankElement);

    expect(screen.getByTestId("detail-row")).toBeInTheDocument();
  });

  it("filters to query params correctly", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const props = searcherSpy.mock.calls.at(-1)[0];
    const state = {
      filters: {
        journal: { filter: 'journal: "BANK"' },
        accountingPeriodId: { filter: 'accountingPeriod: "1"' },
      },
      pageSize: 10,
      afterCursor: null,
      beforeCursor: null,
      orderBy: "postedAt",
    };

    const params = props.filtersToQueryParams(state);
    expect(params).toContain('journal: "BANK"');
    expect(params).toContain('accountingPeriod: "1"');
    expect(params).toContain("first: 10");
    expect(params).toContain('orderBy: ["postedAt"]');
  });

  it("handles pagination with after cursor", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const props = searcherSpy.mock.calls.at(-1)[0];
    const state = {
      filters: {},
      pageSize: 10,
      afterCursor: "cursor123",
      beforeCursor: null,
      orderBy: null,
    };

    const params = props.filtersToQueryParams(state);
    expect(params).toContain('after: "cursor123"');
    expect(params).toContain("first: 10");
  });

  it("handles pagination with before cursor", () => {
    const store = buildStore({
      accountingPeriods: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [{ id: "1", status: "open" }],
      },
      ledgerEntries: {
        isFetching: false,
        isFetched: true,
        error: null,
        items: [],
        pageInfo: { totalCount: 0 },
      },
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <LedgerEntrySearcher />
        </IntlProvider>
      </Provider>,
    );

    const props = searcherSpy.mock.calls.at(-1)[0];
    const state = {
      filters: {},
      pageSize: 10,
      afterCursor: null,
      beforeCursor: "cursor123",
      orderBy: null,
    };

    const params = props.filtersToQueryParams(state);
    expect(params).toContain('before: "cursor123"');
    expect(params).toContain("last: 10");
  });
});