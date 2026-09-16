import React, { useEffect, useRef } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Alert, Box, Grid, Paper, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Helmet,
  Searcher,
  formatAmount,
  formatMessage,
  formatMessageWithValues,
  withModulesManager,
} from "@openimis/fe-core";
import PartyLedgerFilter from "../components/PartyLedgerFilter";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import { hasLedgerReportingRight } from "../utils/permissions";
import { formatSignedBalance } from "../utils/balance";
import { fetchAccountingPeriods, fetchPartyLedgerBalance } from "../actions";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...(theme?.paper?.paper ?? {}),
  boxShadow: "none",
  width: "100%",
  "& .paperBody": { padding: theme.spacing(2) },
}));

/**
 * User Story 2 — Party sub-ledger. `partyLedgerBalance` is a paginated
 * connection (one balance row per accounting period for an analytic value);
 * pagination/filters are handled by the shared fe-core `Searcher`.
 */
const PartyLedgerPage = ({
  intl,
  modulesManager,
  rights,
  partyLedgerBalance,
  accountingPeriods,
  fetchedAccountingPeriods,
  fetchingAccountingPeriods,
  fetchAccountingPeriods,
  fetchPartyLedgerBalance,
}) => {
  // Populated by filtersToQueryParams right before the base Searcher calls
  // fetch(), which only forwards the raw params string array.
  const fetchContextRef = useRef({ filters: {}, pageInfo: {} });

  useEffect(() => {
    if (!fetchedAccountingPeriods && !fetchingAccountingPeriods) {
      fetchAccountingPeriods();
    }
    // Fetch periods once on mount; do NOT re-run on fetch-state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetch = () => {
    const { filters, pageInfo } = fetchContextRef.current;
    return fetchPartyLedgerBalance({
      displayName: filters.displayName,
      periodCode: filters.periodCode,
      first: pageInfo.first,
      after: pageInfo.after,
    });
  };

  // The backend only filters on the exact analytic value display name (no id
  // filter) and on the accounting period code.
  const filtersToQueryParams = (state) => {
    const party = state.filters?.party?.value ?? null;
    const periodId = state.filters?.accountingPeriod?.value ?? null;
    const periodCode = accountingPeriods.find((period) => period.id === periodId)?.code ?? null;
    fetchContextRef.current = {
      filters: { displayName: party?.displayName ?? null, periodCode },
      pageInfo: { first: state.pageSize, after: state.afterCursor, before: state.beforeCursor },
    };
    const params = [];
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

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const items = partyLedgerBalance?.items || [];
  const fetched = partyLedgerBalance?.isFetched;
  const selectedFilters = fetchContextRef.current.filters || {};
  const isScoped = !!(selectedFilters.displayName && selectedFilters.periodCode);
  const balanceInfo = formatSignedBalance(items[0]?.balanceAmount ?? 0);

  // Totals over the rows of the current page (the connection is paginated).
  const totals = items.reduce(
    (acc, row) => ({
      debit: acc.debit + Number(row.debitAmount ?? 0),
      credit: acc.credit + Number(row.creditAmount ?? 0),
      balance: acc.balance + Number(row.balanceAmount ?? 0),
    }),
    { debit: 0, credit: 0, balance: 0 },
  );

  const headers = () => [
    "ledger.partyLedgerPage.periodColumn",
    "ledger.entry.debit",
    "ledger.entry.credit",
    "ledger.entry.balance",
  ];

  const itemFormatters = () => [
    (row) => row.accountingPeriod?.code || row.accountingPeriod?.name || "-",
    (row) => formatAmount(modulesManager, intl, row.debitAmount ?? 0),
    (row) => formatAmount(modulesManager, intl, row.creditAmount ?? 0),
    (row) => formatAmount(modulesManager, intl, row.balanceAmount ?? 0),
  ];

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")} />
        <Grid container direction="column">
          {!!items.length && (
            <Grid size={12}>
              <StyledPaper>
                <Box className="paperBody">
                  <Typography variant="subtitle2">
                    {formatMessage(intl, "ledger", "ledger.partyLedgerPage.totalsTitle")}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary">
                        {formatMessage(intl, "ledger", "ledger.entry.debit")}
                      </Typography>
                      <Typography variant="h6">{formatAmount(modulesManager, intl, totals.debit)}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary">
                        {formatMessage(intl, "ledger", "ledger.entry.credit")}
                      </Typography>
                      <Typography variant="h6">{formatAmount(modulesManager, intl, totals.credit)}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="caption" color="text.secondary">
                        {formatMessage(intl, "ledger", "ledger.entry.balance")}
                      </Typography>
                      <Typography variant="h6">{formatAmount(modulesManager, intl, totals.balance)}</Typography>
                    </Grid>
                  </Grid>
                  {isScoped ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {formatMessage(intl, "ledger", `ledger.balance.${balanceInfo.legend}`)}
                    </Typography>
                  ) : null}
                </Box>
              </StyledPaper>
            </Grid>
          )}

          {fetched && !items.length ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">{formatMessage(intl, "ledger", "ledger.partyLedgerPage.emptyState")}</Alert>
              </Box>
            </Grid>
          ) : null}
          <Grid size={12}>
            <Searcher
              module="ledger"
              cacheFiltersKey="ledgerPartyBalanceFiltersCache"
              FilterPane={PartyLedgerFilter}
              items={items}
              itemsPageInfo={partyLedgerBalance?.pageInfo}
              fetchingItems={partyLedgerBalance?.isFetching}
              fetchedItems={partyLedgerBalance?.isFetched}
              errorItems={partyLedgerBalance?.error}
              tableTitle={formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.statementTitle", {
                count: partyLedgerBalance?.pageInfo?.totalCount ?? 0,
              })}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              defaultFilters={() => ({})}
              fetch={fetch}
              rowIdentifier={(row) => row.id}
              filtersToQueryParams={filtersToQueryParams}
              headers={headers}
              itemFormatters={itemFormatters}
            />
          </Grid>
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  partyLedgerBalance: state.ledger.partyLedgerBalance,
  accountingPeriods: state.ledger.accountingPeriods?.items || [],
  fetchingAccountingPeriods: state.ledger.accountingPeriods.isFetching,
  fetchedAccountingPeriods: state.ledger.accountingPeriods.isFetched,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ fetchAccountingPeriods, fetchPartyLedgerBalance }, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PartyLedgerPage)));
