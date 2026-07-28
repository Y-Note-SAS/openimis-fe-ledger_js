import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
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

const StyledLedgerEntryDetails = styled("div")(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: theme.spacing(1),
  },
  "& th, & td": {
    padding: theme.spacing(0.75, 2),
    textAlign: "left",
    verticalAlign: "top",
  },
  "& th:nth-of-type(1), & td:nth-of-type(1)": {
    width: "auto",
  },
  "& th:nth-of-type(2), & td:nth-of-type(2)": {
    width: "auto",
  },
  "& th:nth-of-type(3), & td:nth-of-type(3)": {
    width: "auto",
  },
  "& th:nth-of-type(4), & th:nth-of-type(5), & td:nth-of-type(4), & td:nth-of-type(5)": {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    width: "1%",
  },
  "& tfoot td": {
    borderTop: `1px solid ${theme.palette.divider}`,
    fontWeight: 600,
  },
  "& .entry-summary": {
    marginBottom: theme.spacing(0.5),
  },
  "& .detail-source-link": {
    display: "inline-block",
    marginBottom: theme.spacing(0.25),
  },
}));

class LedgerEntrySearcher extends Component {
  state = {
    expandedEntryId: null,
  };

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
      (entry) => <ExpandIcon fontSize="small" />,
    ];
  };

  toggleEntry = (entry) => {
    this.setState((state) => ({ expandedEntryId: state.expandedEntryId === entry.id ? null : entry.id }));
  };

  displayItems = () => {
    return this.props.ledgerEntries.items || [];
  };

  renderEntryDetails = (entry) => {
    const { intl } = this.props;
    if (!entry) return null;

    return (
      <StyledLedgerEntryDetails className="ledger-entry-details">
        <div className="entry-summary">
          <a className="detail-source-link" href={`#/${entry.sourceEventType}/${entry.sourceEventReference}`}>
            {entry.sourceEventType} - {entry.sourceEventReference}
          </a>
        </div>
        <table>
          <thead>
            <tr>
              <th>{formatMessage(intl, "ledger", "ledger.entryLine.account")}</th>
              <th>{formatMessage(intl, "ledger", "ledger.entryLine.party")}</th>
              <th>{formatMessage(intl, "ledger", "ledger.entryLine.funder")}</th>
              <th>{formatMessage(intl, "ledger", "ledger.entryLine.debit")}</th>
              <th>{formatMessage(intl, "ledger", "ledger.entryLine.credit")}</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line) => (
              <tr key={line.id}>
                <td>{`${line.account?.code || ""} ${line.account?.name || ""}`}</td>
                <td>{line.partyTag?.displayName || ""}</td>
                <td>{line.funderTag?.displayName || ""}</td>
                <td>{line.debit ?? ""}</td>
                <td>{line.credit ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>{formatMessage(intl, "ledger", "ledger.entry.subtotal")}</td>
              <td></td>
              <td></td>
              <td>{entry.totals?.debit}</td>
              <td>{entry.totals?.credit}</td>
            </tr>
          </tfoot>
        </table>
      </StyledLedgerEntryDetails>
    );
  };

  render() {
    const { intl, ledgerEntries } = this.props;
    const count = ledgerEntries.pageInfo?.totalCount ?? 0;
    const items = this.displayItems();

    return (
      <Searcher
        module="ledger"
        cacheFiltersKey="ledgerEntriesPageFiltersCache"
        FilterPane={LedgerEntryFilter}
        items={items}
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
        detailRowFormatter={(entry) =>
          entry.id === this.state.expandedEntryId ? this.renderEntryDetails(entry) : null
        }
        onRowClick={(entry) => this.toggleEntry(entry)}
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
