import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import { IntlProvider } from "react-intl";
import { graphqlWithVariables } from "@openimis/fe-core";
import { initialState as ledgerInitialState } from "../../src/reducer";
import AccountsSearcher from "../../src/components/AccountsSearcher";

const searcherSpy = vi.hoisted(() => vi.fn());

/** Renders the whole row: no formatter index, so a new column cannot break it. */
const renderRow = (props, item) =>
  render(
    <>
      {props.itemFormatters({}).map((format, index) => (
        <span key={index}>{format(item)}</span>
      ))}
    </>,
  );

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

const renderSearcher = (accountsOverride, props = {}) =>
  render(
    <Provider store={buildStore(accountsOverride)}>
      <IntlProvider locale="en" messages={{}}>
        <AccountsSearcher {...props} />
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

  it("puts the create action inside the panel header and the row actions in the table", () => {
    const onCreate = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderSearcher({}, { canManage: true, onCreate, onEdit, onDelete });

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.headers({})).toContain("ledger.accounts.table.actions");

    // The action lives in the header title node (one single header row): target
    // the button by its role rather than by an internal class name.
    const { container: header } = render(<>{props.tableTitle}</>);
    fireEvent.click(within(header).getByRole("button"));
    expect(onCreate).toHaveBeenCalledTimes(1);

    const account = { id: "uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves" };
    const { container } = renderRow(props, account);
    fireEvent.click(container.querySelector('[aria-label="ledger.accounts.actions.edit"]'));
    fireEvent.click(container.querySelector('[aria-label="ledger.accounts.actions.delete"]'));

    expect(onEdit).toHaveBeenCalledWith(account);
    expect(onDelete).toHaveBeenCalledWith(account);
  });

  it("hides every management action without the administrator right", () => {
    renderSearcher({}, { canManage: false });

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.headers({})).not.toContain("ledger.accounts.table.actions");
    // Stable check instead of a formatter count: a new column must not break
    // this test, only a real management leak should.
    const formatters = props.itemFormatters({});
    const { container: row } = render(
      <>
        {formatters.map((format, index) => (
          <span key={index}>{format({ id: "uuid-1", uuid: "uuid-1" })}</span>
        ))}
      </>,
    );
    expect(row.querySelector('[aria-label="ledger.accounts.actions.delete"]')).toBeNull();
    expect(row.querySelector('[aria-label="ledger.accounts.actions.edit"]')).toBeNull();

    const { container } = render(<>{props.tableTitle}</>);
    expect(container.querySelector(".tableTitleAction")).toBeNull();
  });

  it("indents child accounts and shows their parent code", () => {
    renderSearcher({
      items: [
        { id: "uuid-0", uuid: "uuid-0", code: "570", name: "Caisse", type: "AS", level: 0, currencies: ["XAF"] },
        { id: "uuid-1", uuid: "uuid-1", code: "7010", name: "Ventes", type: "IN", level: 0, currencies: ["XAF"] },
        {
          id: "uuid-2",
          uuid: "uuid-2",
          code: "7011",
          name: "Ventes clients",
          type: "IN",
          level: 1,
          parent: { id: "uuid-1", uuid: "uuid-1", code: "7010", name: "Ventes" },
          children: { totalCount: 0 },
          currencies: ["XAF"],
        },
      ],
    });

    const props = searcherSpy.mock.calls.at(-1)[0];
    expect(props.headers({})).toContain("ledger.accounts.table.parent");

    const indentationOf = (item) => {
      const { container } = renderRow(props, item);
      return [...container.querySelectorAll("span")].map((span) => span.style.paddingLeft);
    };

    // The child row is indented and displays its parent code; a root row does not.
    const child = props.items[2];
    const root = props.items[0];
    expect(indentationOf(child).filter((padding) => padding === "20px").length).toBeGreaterThan(0);
    expect(indentationOf(root).every((padding) => padding === "" || padding === "0px")).toBe(true);
    expect(renderRow(props, child).container.textContent).toContain("7010");
    expect(renderRow(props, root).container.textContent).not.toContain("7010");
  });

  it("blocks the deletion of an account that still has sub-accounts", () => {
    const onDelete = vi.fn();
    renderSearcher(
      {
        items: [
          {
            id: "uuid-1",
            uuid: "uuid-1",
            code: "7010",
            name: "Ventes",
            type: "IN",
            level: 0,
            children: { totalCount: 2 },
            currencies: ["XAF"],
          },
        ],
      },
      { canManage: true, onDelete },
    );

    const props = searcherSpy.mock.calls.at(-1)[0];
    const { container } = render(<>{props.itemFormatters({}).at(-1)(props.items[0])}</>);
    const deleteButton = container.querySelector('[aria-label="ledger.accounts.actions.deleteBlocked"]');
    expect(deleteButton).toBeDisabled();

    fireEvent.click(deleteButton);
    expect(onDelete).not.toHaveBeenCalled();
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
