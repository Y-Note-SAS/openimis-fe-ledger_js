import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { graphqlWithVariables } from "@openimis/fe-core";
import { initialState as ledgerInitialState } from "../../src/reducer";
import AccountsSearcher from "../../src/components/AccountsSearcher";

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

const buildStore = (accountsOverride = {}) =>
  createStore(
    combineReducers({
      ledger: () => ({
        ...ledgerInitialState,
        accounts: {
          isFetching: false,
          isFetched: true,
          error: null,
          items: [{ id: "uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves", type: "EQ", currencies: ["XAF"] }],
          pageInfo: { totalCount: 1 },
          ...accountsOverride,
        },
      }),
    }),
    applyMiddleware(thunk),
  );

const renderSearcher = (accountsOverride) =>
  render(
    <Provider store={buildStore(accountsOverride)}>
      <IntlProvider locale="en" messages={{}}>
        <AccountsSearcher />
      </IntlProvider>
    </Provider>,
  );

describe("AccountsSearcher", () => {
  beforeEach(() => {
    searcherSpy.mockClear();
    graphqlWithVariables.mockClear();
  });

  it("renders the paginated searcher with the loaded accounts", () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(screen.getByText("searcher")).toBeInTheDocument();
    expect(props.items).toHaveLength(1);
    expect(props.itemsPageInfo).toEqual({ totalCount: 1 });
    expect(props.filtersToQueryParams).toBeDefined();
    expect(props.rowIdentifier({ id: "uuid-1" })).toBe("uuid-1");
  });

  it("builds the account query variables from the applied filters and the page cursors", async () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    props.filtersToQueryParams({
      filters: {
        code: { value: "1200", filter: 'code: "1200"' },
        type: { value: "EQ", filter: "type: EQ" },
        isBankAccount: { value: false, filter: "isBankAccount: false" },
      },
      pageSize: 20,
      afterCursor: "cursor-1",
      beforeCursor: null,
      orderBy: null,
    });
    await props.fetch();

    expect(graphqlWithVariables).toHaveBeenCalled();
    const [operation, variables] = graphqlWithVariables.mock.calls.at(-1);
    expect(operation).toContain("query Accounts");
    expect(operation).toContain("accounts(");
    expect(operation).not.toContain("orderBy");
    expect(variables).toEqual({
      first: 20,
      after: "cursor-1",
      before: null,
      last: null,
      code: "1200",
      fullCode: null,
      type: "EQ",
      isBankAccount: false,
    });
  });

  it("maps the raw query params to the Searcher display filters", () => {
    renderSearcher();

    const props = searcherSpy.mock.calls.at(-1)[0];
    const params = props.filtersToQueryParams({
      filters: {
        type: { value: "AS", filter: "type: AS" },
        isBankAccount: { value: true, filter: "isBankAccount: true" },
      },
      pageSize: 10,
      afterCursor: null,
      beforeCursor: null,
    });

    expect(params).toEqual(["type: AS", "isBankAccount: true", "first: 10"]);
  });
});
