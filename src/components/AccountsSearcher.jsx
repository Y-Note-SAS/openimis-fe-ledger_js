import React, { useRef } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { IconButton } from "@mui/material";
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

const AddIcon = GetIconComponent("Add");
const EditIcon = GetIconComponent("Edit");
const DeleteIcon = GetIconComponent("Delete");

/* Paginated chart of accounts (ticket 37991). The `accounts` connection exposes
   no `orderBy`, so the table is intentionally not sortable.
   Creation/edition/deletion are exposed through the `onCreate`/`onEdit`/
   `onDelete` callbacks (owned by the page), and only rendered when the user is
   allowed to manage accounts (`canManage`). */
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
    "ledger.accounts.table.type",
    "ledger.accounts.table.isBankAccount",
    "ledger.accounts.table.currencies",
    ...(canManage ? ["ledger.accounts.table.actions"] : []),
  ];

  const itemFormatters = () => [
    (account) => account.code,
    (account) => account.fullCode,
    (account) => account.name,
    (account) => formatMessage(intl, "ledger", `ledger.accountTypeValue.${account.type}`),
    (account) =>
      account.isBankAccount ? formatMessage(intl, "ledger", "ledger.yes") : formatMessage(intl, "ledger", "ledger.no"),
    (account) => (account.currencies || []).join(", "),
    ...(canManage
      ? [
          (account) => (
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
                    aria-label={formatMessage(intl, "ledger", "ledger.accounts.actions.delete")}
                    onClick={() => onDelete?.(account)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>,
                formatMessage(intl, "ledger", "ledger.accounts.actions.delete"),
              )}
            </>
          ),
        ]
      : []),
  ];

  const searcherActions = [
    {
      label: formatMessage(intl, "ledger", "ledger.accounts.create.title"),
      icon: <AddIcon />,
      authorized: canManage,
      onClick: onCreate,
    },
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
      tableTitle={formatMessageWithValues(intl, "ledger", "ledger.accounts.tableTitle", { count })}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      fetch={fetch}
      rowIdentifier={rowIdentifier}
      filtersToQueryParams={filtersToQueryParams}
      headers={headers}
      itemFormatters={itemFormatters}
      enableActionButtons={canManage}
      searcherActions={searcherActions}
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
