import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { graphqlWithVariables } from "@openimis/fe-core";
import { initialState as ledgerInitialState } from "../../src/reducer";
import JournalsSearcher from "../../src/components/JournalsSearcher";

const searcherSpy = vi.hoisted(() => vi.fn());

vi.mock("@openimis/fe-core", async () => {
  const actual = await vi.importActual("@openimis/fe-core");
  return {
    ...actual,
    // Explicit, so the test does not rely on the shared fe-core test mock
    // (aliased in vite.config.js) to provide the spy.
    graphqlWithVariables: vi.fn((...args) => ({
      type: "MOCK_THUNK",
      operation: args[0],
      variables: args[1],
      actionTypes: args[2],
    })),
    Searcher: (props) => {
      searcherSpy(props);
      return (
        <div>
          <div>searcher</div>
          {props.items?.map((item) => (
            <div key={item.id}>{item.code}</div>
          ))}
        </div>
      );
    },
  };
});

const buildStore = () =>
  createStore(
    combineReducers({
      ledger: () => ({
        ...ledgerInitialState,
        journals: {
          isFetching: false,
          isFetched: true,
          error: null,
          items: [
            {
              id: "journal-1",
              code: "BANK",
              name: "Bank",
              type: { id: "uuid-2", code: "bank", type: "Bank & Checks Journal", altLanguage: "Banque" },
              defaultDebitAccountId: { id: "acc-1", uuid: "acc-1", code: "5120", name: "Banque" },
              defaultCreditAccountId: { id: "acc-2", uuid: "acc-2", code: "7010", name: "Ventes" },
            },
          ],
          pageInfo: { totalCount: 1 },
        },
        journalTypes: {
          isFetching: false,
          isFetched: true,
          error: null,
          items: [{ id: "uuid-2", code: "bank", type: "Bank & Checks Journal", altLanguage: "Banque" }],
        },
      }),
    }),
    applyMiddleware(thunk),
  );

const renderSearcher = () =>
  render(
    <Provider store={buildStore()}>
      <IntlProvider locale="en" messages={{}}>
        <JournalsSearcher />
      </IntlProvider>
    </Provider>,
  );

describe("JournalsSearcher", () => {
  beforeEach(() => {
    searcherSpy.mockClear();
    graphqlWithVariables.mockClear();
  });

  it("renders the paginated searcher with the loaded journals", () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(screen.getByText("searcher")).toBeInTheDocument();
    expect(props.items).toHaveLength(1);
    expect(props.itemsPageInfo).toEqual({ totalCount: 1 });
    expect(props.rowIdentifier({ id: "journal-1" })).toBe("journal-1");
  });

  it("renders the translated journal type and the default accounts", () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    const formatters = props.itemFormatters({});
    const journal = props.items[0];

    expect(formatters[2](journal)).toBe("Banque");
    expect(formatters[3](journal)).toBe("5120 — Banque");
    expect(formatters[4](journal)).toBe("7010 — Ventes");
  });

  it("builds the journal query variables from the applied filters and cursors", async () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    props.filtersToQueryParams({
      filters: {
        name: { value: "Bank", filter: 'name: "Bank"' },
        code: { value: "BANK", filter: 'code: "BANK"' },
        type: {
          value: { id: "uuid-2", code: "bank" },
          filter: 'type_Id: "uuid-2"',
        },
      },
      pageSize: 10,
      afterCursor: null,
      beforeCursor: null,
    });
    await props.fetch();

    const [operation, variables] = graphqlWithVariables.mock.calls.at(-1);
    expect(operation).toContain("query JournalsList");
    expect(operation).toContain("type_Id: $typeId");
    expect(operation).toContain("defaultDebitAccountId");
    expect(variables).toEqual({
      first: 10,
      after: null,
      before: null,
      last: null,
      name: "Bank",
      code: "BANK",
      typeId: "uuid-2",
    });
  });

  it("maps the raw query params to the Searcher display filters", () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    const params = props.filtersToQueryParams({
      filters: { code: { value: "BANK", filter: 'code: "BANK"' } },
      pageSize: 20,
      afterCursor: "cursor-1",
      beforeCursor: null,
    });

    expect(params).toEqual(['code: "BANK"', 'after: "cursor-1"', "first: 20"]);
  });
});
