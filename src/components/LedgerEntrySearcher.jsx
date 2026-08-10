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
  formatAmount,
  GetIconComponent,
  historyPush,
  withHistory,
  withModulesManager,
} from "@openimis/fe-core";
import { fetchAccountingPeriodsMock, fetchLedgerEntriesMock } from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import LedgerEntryFilter from "./LedgerEntryFilter";

const ExpandIcon = GetIconComponent("ExpandMore");
const CheckCircleIcon = GetIconComponent("CheckCircle");

const LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY = "ledger.LedgerEntrySearcher";
const ALL_PERIODS_FILTER_VALUE = "__all__";

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
    width: "30%",
  },
  "& th:nth-of-type(2), & td:nth-of-type(2)": {
    width: "25%",
  },
  "& th:nth-of-type(3), & td:nth-of-type(3)": {
    width: "25%",
  },
  "& th:nth-of-type(4), & td:nth-of-type(4)": {
    width: "10%",
    textAlign: "left",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  "& th:nth-of-type(5), & td:nth-of-type(5)": {
    width: "10%",
    textAlign: "left",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  "& tfoot td": {
    borderTop: `1px solid ${theme.palette?.divider || "#e0e0e0"}`,
    fontWeight: 600,
  },
  "& .entry-summary": {
    marginBottom: theme.spacing(0.5),
  },
  "& .detail-source-link": {
    display: "inline-flex",
    alignItems: "center",
    marginBottom: theme.spacing(0.25),
    padding: 0,
    border: 0,
    background: "transparent",
    color: theme.palette?.primary?.main || "#1976d2",
    cursor: "pointer",
    textDecoration: "underline",
    font: "inherit",
  },
  "& .detail-source-link:disabled": {
    color: theme.palette?.text?.secondary || "#757575",
    cursor: "default",
    textDecoration: "none",
  },
  "& .subtotal-label": {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  "& .balanced-indicator": {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    color: theme.palette?.success?.main || "#2e7d32",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
}));

class LedgerEntrySearcher extends Component {
  state = {
    expandedEntryId: null,
  };

  componentDidMount() {
    const { fetchedAccountingPeriods, fetchingAccountingPeriods, fetchAccountingPeriodsMock } = this.props;
    if (!fetchedAccountingPeriods && !fetchingAccountingPeriods) {
      fetchAccountingPeriodsMock();
    }
  }

  fetch = (params) => {
    this.props.fetchLedgerEntriesMock(params);
  };

  defaultFilters = () => {
    const openPeriod = this.props.accountingPeriods.find((period) => period.status === "open");
    if (!openPeriod) {
      return {};
    }
    return {
      accountingPeriodId: {
        value: openPeriod.id,
        filter: `accountingPeriod: "${openPeriod.id}"`,
      },
    };
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
      (entry) => formatAmount(modulesManager, intl, entry.totals?.debit ?? 0),
      (entry) => formatAmount(modulesManager, intl, entry.totals?.credit ?? 0),
      (entry) => formatAmount(modulesManager, intl, entry.totals?.balance ?? 0),
    ];
  };

  toggleEntry = (entry) => {
    this.setState((state) => ({ expandedEntryId: state.expandedEntryId === entry.id ? null : entry.id }));
  };

  displayItems = () => {
    return this.props.ledgerEntries.items || [];
  };

  sourceEventRouteRef = (entry) => {
    switch (entry?.sourceEventType) {
      case "claim_payment":
        return "claim.route.claimEdit";
      case "invoice":
        return "invoice.route.invoice";
      case "payroll_disbursement":
        return "payroll.route.payroll";
      case "payment_point_reconciliation":
        return "payroll.route.paymentPoint";
      default:
        return null;
    }
  };

  navigateToSourceEvent = (entry) => {
    const routeRef = this.sourceEventRouteRef(entry);
    if (!routeRef || !entry?.sourceEventReference) return;
    historyPush(this.props.modulesManager, this.props.history, routeRef, [entry.sourceEventReference]);
  };

  renderEntryDetails = (entry) => {
    const { intl, modulesManager } = this.props;
    if (!entry) return null;

    const lines = entry.lines || [];
    const isBalanced = entry.totals?.balance === 0 && entry.totals?.debit === entry.totals?.credit;
    const sourceRouteRef = this.sourceEventRouteRef(entry);

    return (
      <StyledLedgerEntryDetails className="ledger-entry-details">
        <div className="entry-summary">
          <button
            type="button"
            className="detail-source-link"
            onClick={() => this.navigateToSourceEvent(entry)}
            disabled={!sourceRouteRef}
          >
            {entry.sourceEventType} - {entry.sourceEventReference}
          </button>
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
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{`${line.account?.code || ""} ${line.account?.name || ""}`}</td>
                <td>{line.partyTag?.displayName || ""}</td>
                <td>{line.funderTag?.displayName || ""}</td>
                <td>{line.debit == null ? "" : formatAmount(modulesManager, intl, line.debit)}</td>
                <td>{line.credit == null ? "" : formatAmount(modulesManager, intl, line.credit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <span className="subtotal-label">
                  {formatMessage(intl, "ledger", "ledger.entry.subtotal")}
                  {isBalanced && (
                    <span className="balanced-indicator">
                      <CheckCircleIcon fontSize="small" />
                      {formatMessage(intl, "ledger", "ledger.entry.debitEqualsCredit")}
                    </span>
                  )}
                </span>
              </td>
              <td></td>
              <td></td>
              <td>{formatAmount(modulesManager, intl, entry.totals?.debit ?? 0)}</td>
              <td>{formatAmount(modulesManager, intl, entry.totals?.credit ?? 0)}</td>
            </tr>
          </tfoot>
        </table>
      </StyledLedgerEntryDetails>
    );
  };

  render() {
    const { intl, ledgerEntries, fetchedAccountingPeriods } = this.props;
    const count = ledgerEntries.pageInfo?.totalCount ?? 0;
    const items = this.displayItems();

    if (!fetchedAccountingPeriods) {
      return null;
    }

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
        defaultFilters={this.defaultFilters()}
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
  accountingPeriods: state.ledger.accountingPeriods.items,
  fetchingAccountingPeriods: state.ledger.accountingPeriods.isFetching,
  fetchedAccountingPeriods: state.ledger.accountingPeriods.isFetched,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchLedgerEntriesMock, fetchAccountingPeriodsMock }, dispatch);

export { LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(withHistory(connect(mapStateToProps, mapDispatchToProps)(injectIntl(LedgerEntrySearcher))));
