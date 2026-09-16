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
import JournalTypePicker, { journalTypeLabel } from "../pickers/JournalTypePicker";
import { fetchJournalsList } from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import JournalsFilter from "./JournalsFilter";

const JOURNALS_SEARCHER_CONTRIBUTION_KEY = "ledger.JournalsSearcher";

const AddIcon = GetIconComponent("Add");
const EditIcon = GetIconComponent("Edit");
const DeleteIcon = GetIconComponent("Delete");

/* Paginated journals list (ticket 37990). `ledgerJournal` exposes no `orderBy`,
   so the table is intentionally not sortable.
   Creation/edition/deletion are exposed through the `onCreate`/`onEdit`/
   `onDelete` callbacks (owned by the page), and only rendered when the user is
   allowed to manage journals (`canManage`). */
const JournalsSearcher = ({
  intl,
  journals,
  journalTypes,
  canManage = false,
  onCreate,
  onEdit,
  onDelete,
  fetchJournalsList: loadJournals,
}) => {
  // Populated by filtersToQueryParams right before the base Searcher calls
  // fetch(), which only forwards the raw params string array.
  const fetchContextRef = useRef({ filters: {}, pageInfo: {} });

  const fetch = () => {
    const { filters, pageInfo } = fetchContextRef.current;
    return loadJournals(filters, pageInfo);
  };

  const rowIdentifier = (journal) => journal.id;

  const filtersToQueryParams = (state) => {
    const valueOf = (key) => state.filters?.[key]?.value ?? null;
    const type = valueOf("type");
    fetchContextRef.current = {
      filters: {
        name: valueOf("name") || null,
        code: valueOf("code") || null,
        typeId: type?.id ?? null,
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

  const typeLabel = (journalType) => {
    if (!journalType) return "";
    const known = (journalTypes || []).find((node) => node.id === journalType.id) || journalType;
    return journalTypeLabel(intl, known);
  };

  const headers = () => [
    "ledger.journals.table.code",
    "ledger.journals.table.name",
    "ledger.journals.table.type",
    "ledger.journals.table.defaultDebitAccount",
    "ledger.journals.table.defaultCreditAccount",
    ...(canManage ? ["ledger.journals.table.actions"] : []),
  ];

  const itemFormatters = () => [
    (journal) => journal.code,
    (journal) => journal.name,
    (journal) => typeLabel(journal.type),
    (journal) =>
      journal.defaultDebitAccountId
        ? `${journal.defaultDebitAccountId.code} — ${journal.defaultDebitAccountId.name}`
        : "",
    (journal) =>
      journal.defaultCreditAccountId
        ? `${journal.defaultCreditAccountId.code} — ${journal.defaultCreditAccountId.name}`
        : "",
    ...(canManage
      ? [
          (journal) => (
            <>
              {withTooltip(
                <span>
                  <IconButton
                    size="small"
                    aria-label={formatMessage(intl, "ledger", "ledger.journals.actions.edit")}
                    onClick={() => onEdit?.(journal)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>,
                formatMessage(intl, "ledger", "ledger.journals.actions.edit"),
              )}
              {withTooltip(
                <span>
                  <IconButton
                    size="small"
                    aria-label={formatMessage(intl, "ledger", "ledger.journals.actions.delete")}
                    onClick={() => onDelete?.(journal)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>,
                formatMessage(intl, "ledger", "ledger.journals.actions.delete"),
              )}
            </>
          ),
        ]
      : []),
  ];

  const items = journals?.items || [];
  // `pageInfo.totalCount` is filled by the reducer from the connection's
  // `totalCount` (a sibling field of `pageInfo` in the GraphQL response).
  const count = journals?.pageInfo?.totalCount ?? 0;

  return (
    <Searcher
      module="ledger"
      cacheFiltersKey="ledgerJournalsPageFiltersCache"
      FilterPane={JournalsFilter}
      items={items}
      itemsPageInfo={journals?.pageInfo}
      fetchingItems={journals?.isFetching}
      fetchedItems={journals?.isFetched}
      errorItems={journals?.error}
      contributionKey={JOURNALS_SEARCHER_CONTRIBUTION_KEY}
      tableTitle={
        <>
          <span>{formatMessageWithValues(intl, "ledger", "ledger.journals.tableTitle", { count })}</span>
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
              {formatMessage(intl, "ledger", "ledger.journals.create.title")}
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
  journals: state.ledger.journals,
  journalTypes: state.ledger.journalTypes.items,
});

const mapDispatchToProps = {
  fetchJournalsList,
};

export { JOURNALS_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(connect(mapStateToProps, mapDispatchToProps)(injectIntl(JournalsSearcher)));
