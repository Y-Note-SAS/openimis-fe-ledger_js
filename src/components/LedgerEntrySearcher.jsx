import React, { useState, useEffect, useRef } from "react";
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
import { fetchAccountingPeriods, fetchLedgerEntries } from "../actions";
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

const LedgerEntrySearcher = ({
  intl,
  modulesManager,
  history,
  ledgerEntries,
  accountingPeriods,
  fetchingAccountingPeriods,
  fetchedAccountingPeriods,
  fetchLedgerEntries,
  fetchAccountingPeriods,
}) => {
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  // Populated by filtersToQueryParams right before the base Searcher calls
  // fetch(), which only forwards the raw params string array.
  const fetchContextRef = useRef({ filters: {}, pageInfo: {} });

  useEffect(() => {
    if (!fetchedAccountingPeriods && !fetchingAccountingPeriods) {
      fetchAccountingPeriods();
    }
    // Fetch periods once on mount; do NOT re-run on fetch-state changes.
    // Re-running on failure would retry a failing backend query in an
    // infinite loop (flood of 400s).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetch = () => {
    const { filters, pageInfo } = fetchContextRef.current;
    return fetchLedgerEntries(filters, pageInfo);
  };

  const defaultFilters = () => {
    const openPeriod = accountingPeriods.find((period) => period.status === "open");
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

  const rowIdentifier = (entry) => entry.id;

  const filtersToQueryParams = (state) => {
    const valueOf = (key) => state.filters?.[key]?.value ?? null;
    const partyValue = valueOf("partyAnalyticValueId");
    const funderValue = valueOf("funderAnalyticValueId");
    fetchContextRef.current = {
      filters: {
        journal: typeof valueOf("journal") === "string" ? valueOf("journal") : null,
        accountingPeriodId:
          valueOf("accountingPeriodId") === ALL_PERIODS_FILTER_VALUE ? null : valueOf("accountingPeriodId"),
        sourceEventType: typeof valueOf("sourceEventType") === "string" ? valueOf("sourceEventType") : null,
        partyAnalyticValueId: partyValue?.analyticValueId ?? partyValue,
        funderAnalyticValueId: funderValue?.analyticValueId ?? funderValue,
      },
      pageInfo: {
        first: state.pageSize,
        after: state.afterCursor,
        before: state.beforeCursor,
        orderBy: state.orderBy,
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
    if (state.orderBy) {
      params.push(`orderBy: ["${state.orderBy}"]`);
    }
    return params;
  };

  const headers = () => [
    "ledger.entry.journal",
    "ledger.entry.accountingPeriod",
    "ledger.entry.sourceEvent",
    "ledger.entry.postedAt",
    "ledger.entry.debit",
    "ledger.entry.credit",
    "ledger.entry.balance",
    "",
  ];

  const sorts = () => [
    ["journal", true],
    ["accountingPeriod", true],
    ["sourceEventType", true],
    ["postedAt", true],
    null,
    null,
    null,
    null,
  ];

  const itemFormatters = () => {
    return [
      (entry) => entry.journal?.code,
      (entry) => (
        <>
          {entry.accountingPeriod?.id} <Chip size="small" label={entry.accountingPeriod?.status} />
        </>
      ),
      (entry) => `${entry.sourceEventType || ""} ${entry.sourceEventReference || ""}`,
      (entry) => formatDateFromISO(modulesManager, intl, entry.postedAt),
      (entry) => formatAmount(modulesManager, intl, entry.totals?.debit ?? 0),
      (entry) => formatAmount(modulesManager, intl, entry.totals?.credit ?? 0),
      (entry) => formatAmount(modulesManager, intl, entry.totals?.balance ?? 0),
    ];
  };

  const toggleEntry = (entry) => {
    setExpandedEntryId((prevId) => prevId === entry.id ? null : entry.id);
  };

  const displayItems = () => {
    return ledgerEntries.items || [];
  };

  const sourceEventRouteRef = (entry) => {
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

  const navigateToSourceEvent = (entry) => {
    const routeRef = sourceEventRouteRef(entry);
    if (!routeRef || !entry?.sourceEventReference) return;
    historyPush(modulesManager, history, routeRef, [entry.sourceEventReference]);
  };

  const renderEntryDetails = (entry) => {
    if (!entry) return null;

    const lines = entry.lines || [];
    // The deployed backend does not expose the transaction/legs object yet, so
    // there is no line-level detail to render (backend follow-up).
    if (lines.length === 0) return null;
    const isBalanced = entry.totals?.balance === 0 && entry.totals?.debit === entry.totals?.credit;
    const sourceRouteRef = sourceEventRouteRef(entry);

    return (
      <StyledLedgerEntryDetails className="ledger-entry-details">
        <div className="entry-summary">
          <button
            type="button"
            className="detail-source-link"
            onClick={() => navigateToSourceEvent(entry)}
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

  const items = displayItems();
  const count = ledgerEntries.pageInfo?.totalCount ?? 0;

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
      defaultFilters={defaultFilters()}
      fetch={fetch}
      rowIdentifier={rowIdentifier}
      filtersToQueryParams={filtersToQueryParams}
      defaultOrderBy="-postedAt"
      headers={headers}
      itemFormatters={itemFormatters}
      detailRowFormatter={(entry) =>
        entry.id === expandedEntryId ? renderEntryDetails(entry) : null
      }
      onRowClick={toggleEntry}
      sorts={sorts}
    />
  );
};

const mapStateToProps = (state) => ({
  ledgerEntries: state.ledger.ledgerEntries,
  accountingPeriods: state.ledger.accountingPeriods.items,
  fetchingAccountingPeriods: state.ledger.accountingPeriods.isFetching,
  fetchedAccountingPeriods: state.ledger.accountingPeriods.isFetched,
});

const mapDispatchToProps = {
  fetchLedgerEntries,
  fetchAccountingPeriods,
};

export { LEDGER_ENTRY_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(
  withHistory(
    connect(mapStateToProps, mapDispatchToProps)(injectIntl(LedgerEntrySearcher))
  )
);