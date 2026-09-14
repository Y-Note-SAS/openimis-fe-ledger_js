import React, { useRef } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Searcher, formatMessage, formatMessageWithValues, withModulesManager } from "@openimis/fe-core";
import JournalTypePicker, { journalTypeLabel } from "../pickers/JournalTypePicker";
import { fetchJournalsList } from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import JournalsFilter from "./JournalsFilter";

const JOURNALS_SEARCHER_CONTRIBUTION_KEY = "ledger.JournalsSearcher";

/* Paginated journals list (ticket 37990). `ledgerJournal` exposes no `orderBy`,
   so the table is intentionally not sortable. */
const JournalsSearcher = ({ intl, journals, journalTypes, fetchJournalsList: loadJournals }) => {
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
      tableTitle={formatMessageWithValues(intl, "ledger", "ledger.journals.tableTitle", { count })}
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
