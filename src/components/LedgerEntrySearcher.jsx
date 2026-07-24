import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Chip, IconButton, Tooltip } from "@mui/material";
import {
  Searcher,
  formatDateFromISO,
  formatMessage,
  formatMessageWithValues,
  GetIconComponent,
  withHistory,
  withModulesManager,
} from "@openimis/fe-core";
import { fetchLedgerEntriesMock } from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import LedgerEntryFilter from "./LedgerEntryFilter";

const ExpandIcon = GetIconComponent("ExpandMore");

const LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY = "ledger.LedgerEntrySearcher";

class LedgerEntrySearcher extends Component {
  fetch = (params) => {
    this.props.fetchLedgerEntriesMock(params);
  };

  rowIdentifier = (entry) => entry.id;

  filtersToQueryParams = (state) => {
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
    if (state.orderBy) {
      params.push(`orderBy: ["${state.orderBy}"]`);
    }
    return params;
  };

  headers = () => [
    "ledger.entry.journal",
    "ledger.entry.accountingPeriod",
    "ledger.entry.sourceEvent",
    "ledger.entry.postedAt",
    "ledger.entry.debit",
    "ledger.entry.credit",
    "ledger.entry.balance",
    "",
  ];

  sorts = () => [
    ["journal", true],
    ["accountingPeriod", true],
    ["sourceEventType", true],
    ["postedAt", true],
    null,
    null,
    null,
    null,
  ];

  itemFormatters = () => {
    const { intl, modulesManager } = this.props;
    return [
      (entry) => entry.journal?.code,
      (entry) => (
        <Fragment>
          {entry.accountingPeriod?.id} <Chip size="small" label={entry.accountingPeriod?.status} />
        </Fragment>
      ),
      (entry) => `${entry.sourceEventType || ""} ${entry.sourceEventReference || ""}`,
      (entry) => formatDateFromISO(modulesManager, intl, entry.postedAt),
      (entry) => entry.totals?.debit,
      (entry) => entry.totals?.credit,
      (entry) => entry.totals?.balance,
      (entry) => (
        <Tooltip title={formatMessage(intl, "ledger", "ledger.entries.expandTooltip")}>
          <IconButton size="small" onClick={() => this.props.onToggleEntry?.(entry)}>
            <ExpandIcon />
          </IconButton>
        </Tooltip>
      ),
    ];
  };

  render() {
    const { intl, ledgerEntries } = this.props;
    const count = ledgerEntries.pageInfo?.totalCount ?? 0;

    return (
      <Searcher
        module="ledger"
        cacheFiltersKey="ledgerEntriesPageFiltersCache"
        FilterPane={LedgerEntryFilter}
        items={ledgerEntries.items}
        itemsPageInfo={ledgerEntries.pageInfo}
        fetchingItems={ledgerEntries.isFetching}
        fetchedItems={ledgerEntries.isFetched}
        errorItems={ledgerEntries.error}
        contributionKey={LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY}
        tableTitle={formatMessageWithValues(intl, "ledger", "ledger.entries.tableTitle", { count })}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        fetch={this.fetch}
        rowIdentifier={this.rowIdentifier}
        filtersToQueryParams={this.filtersToQueryParams}
        defaultOrderBy="-postedAt"
        headers={this.headers}
        itemFormatters={this.itemFormatters}
        sorts={this.sorts}
      />
    );
  }
}

const mapStateToProps = (state) => ({
  ledgerEntries: state.ledger.ledgerEntries,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchLedgerEntriesMock }, dispatch);

export { LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(withHistory(connect(mapStateToProps, mapDispatchToProps)(injectIntl(LedgerEntrySearcher))));
