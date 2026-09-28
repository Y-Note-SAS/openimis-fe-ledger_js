import React, { useRef } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Button, IconButton } from "@mui/material";
import {
  GetIconComponent,
  Searcher,
  formatMessage,
  formatMessageWithValues,
  withModulesManager,
  withTooltip,
} from "@openimis/fe-core";
import { fetchAccounts } from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import AccountsFilter from "./AccountsFilter";

const ACCOUNTS_SEARCHER_CONTRIBUTION_KEY = "ledger.AccountsSearcher";
const ANY_OPTION = "__any__";
/** Indentation applied to the code/name of a child account (hordak `level`). */
const INDENT_PER_LEVEL = 20;

const AddIcon = GetIconComponent("Add");
const EditIcon = GetIconComponent("Edit");
const DeleteIcon = GetIconComponent("Delete");

/* The chart of accounts is a tree (hordak: `parent`/`children`/`level`), shown
   as a flat paginated list: children are indented according to their `level`
   and the parent code has its own column. */
const IndentedCell = ({ level, children }) => (
  <span style={{ display: "inline-block", paddingLeft: `${(level || 0) * INDENT_PER_LEVEL}px` }}>{children}</span>
);

const subAccountCount = (account) => account?.children?.totalCount ?? 0;

/* Paginated chart of accounts (ticket 37991). The `accounts` connection exposes
   no `orderBy`, so the table is intentionally not sortable.
   Creation/edition/deletion are exposed through the `onCreate`/`onEdit`/
   `onDelete` callbacks (owned by the page), and only rendered when the user is
   allowed to manage accounts (`canManage`). Deleting an account that still has
   sub-accounts is refused client-side (the backend refuses it too, but the
   failure would only surface through the mutation log). */
const AccountsSearcher = ({
  intl,
  accounts,
  canManage = false,
  onCreate,
  onEdit,
  onDelete,
  fetchAccounts: loadAccounts,
}) => {
  // Populated by filtersToQueryParams right before the base Searcher calls
  // fetch(), which only forwards the raw params string array.
  const fetchContextRef = useRef({ filters: {}, pageInfo: {} });

  const fetch = () => {
    const { filters, pageInfo } = fetchContextRef.current;
    return loadAccounts(filters, pageInfo);
  };

  const rowIdentifier = (account) => account.id;

  const filtersToQueryParams = (state) => {
    const valueOf = (key) => state.filters?.[key]?.value ?? null;
    const type = valueOf("type");
    const isBankAccount = valueOf("isBankAccount");
    fetchContextRef.current = {
      filters: {
        code: valueOf("code") || null,
        fullCode: null,
        type: type && type !== ANY_OPTION ? type : null,
        isBankAccount: typeof isBankAccount === "boolean" ? isBankAccount : null,
      },
      pageInfo: {
        first: state.beforeCursor ? null : state.pageSize,
        after: state.afterCursor,
        before: state.beforeCursor,
        last: state.beforeCursor ? state.pageSize : null,
      },
    };
    const params = Object.keys(state.filters)
      .filter((key) => !!state.filters[key]?.filter)
      .map((key) => state.filters[key].filter);
    if (!state.beforeCursor && !state.afterCursor) {
      params.push(`first: ${state.pageSize}`);
    }
    if (state.afterCursor) {
      params.push(`after: "${state.afterCursor}"`);
      params.push(`first: ${state.pageSize}`);
    }
    if (state.beforeCursor) {
      params.push(`before: "${state.beforeCursor}"`);
      params.push(`last: ${state.pageSize}`);
    }
    return params;
  };

  const headers = () => [
    "ledger.accounts.table.code",
    "ledger.accounts.table.fullCode",
    "ledger.accounts.table.name",
    "ledger.accounts.table.parent",
    "ledger.accounts.table.type",
    "ledger.accounts.table.isBankAccount",
    "ledger.accounts.table.currencies",
    ...(canManage ? ["ledger.accounts.table.actions"] : []),
  ];

  const itemFormatters = () => [
    (account) => <IndentedCell level={account.level}>{account.code}</IndentedCell>,
    (account) => account.fullCode,
    (account) => <IndentedCell level={account.level}>{account.name}</IndentedCell>,
    (account) => account.parent?.code ?? "",
    (account) => formatMessage(intl, "ledger", `ledger.accountTypeValue.${account.type}`),
    (account) =>
      account.isBankAccount ? formatMessage(intl, "ledger", "ledger.yes") : formatMessage(intl, "ledger", "ledger.no"),
    (account) => (account.currencies || []).join(", "),
    ...(canManage
      ? [
          (account) => {
            const isParentAccount = subAccountCount(account) > 0;
            const deleteLabel = formatMessage(
              intl,
              "ledger",
              isParentAccount ? "ledger.accounts.actions.deleteBlocked" : "ledger.accounts.actions.delete",
            );
            return (
              <>
                {withTooltip(
                  <span>
                    <IconButton
                      size="small"
                      aria-label={formatMessage(intl, "ledger", "ledger.accounts.actions.edit")}
                      onClick={() => onEdit?.(account)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>,
                  formatMessage(intl, "ledger", "ledger.accounts.actions.edit"),
                )}
                {withTooltip(
                  <span>
                    <IconButton
                      size="small"
                      aria-label={deleteLabel}
                      disabled={isParentAccount}
                      onClick={() => !isParentAccount && onDelete?.(account)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>,
                  deleteLabel,
                )}
              </>
            );
          },
        ]
      : []),
  ];

  const items = accounts?.items || [];
  // `pageInfo.totalCount` is filled by the reducer from the connection's
  // `totalCount` (a sibling field of `pageInfo` in the GraphQL response).
  const count = accounts?.pageInfo?.totalCount ?? 0;

  return (
    <Searcher
      module="ledger"
      cacheFiltersKey="ledgerAccountsPageFiltersCache"
      FilterPane={AccountsFilter}
      items={items}
      itemsPageInfo={accounts?.pageInfo}
      fetchingItems={accounts?.isFetching}
      fetchedItems={accounts?.isFetched}
      errorItems={accounts?.error}
      contributionKey={ACCOUNTS_SEARCHER_CONTRIBUTION_KEY}
      tableTitle={
        <>
          <span>{formatMessageWithValues(intl, "ledger", "ledger.accounts.tableTitle", { count })}</span>
          <span className="tableTitleSpacer" />
          {canManage ? (
            <Button
              className="tableTitleAction"
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={onCreate}
            >
              {formatMessage(intl, "ledger", "ledger.accounts.create.title")}
            </Button>
          ) : null}
        </>
      }
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      fetch={fetch}
      rowIdentifier={rowIdentifier}
      filtersToQueryParams={filtersToQueryParams}
      headers={headers}
      itemFormatters={itemFormatters}
    />
  );
};

const mapStateToProps = (state) => ({
  accounts: state.ledger.accounts,
});

const mapDispatchToProps = {
  fetchAccounts,
};

export { ACCOUNTS_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(connect(mapStateToProps, mapDispatchToProps)(injectIntl(AccountsSearcher)));
