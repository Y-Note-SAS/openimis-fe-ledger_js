import React, { useEffect, useMemo, useRef, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  GRID_RESPONSIVE_STANDARD,
  Helmet,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  formatAmount,
} from "@openimis/fe-core";
import PartyPicker from "../pickers/PartyPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import { hasLedgerReportingRight } from "../utils/permissions";
import { formatSignedBalance } from "../utils/balance";
import { DEFAULT_PAGE_SIZE } from "../constants";
import { fetchPartyLedgerBalance, resetPartyLedgerBalance } from "../actions";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...(theme?.paper?.paper ?? {}),
  boxShadow: "none",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
  "& .paperHeader": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0, 1),
    minHeight: "40px",
    width: "100%",
    color: theme.paper?.header?.color || theme.palette.primary.main,
    ...theme.paper?.header,
    backgroundColor: theme.paper?.header?.backgroundColor || theme.palette.primary.light,
  },
  "& .paperHeaderTitle": {
    ...theme.paper?.title,
    backgroundColor: "transparent",
    padding: theme.spacing(0.5, 1),
    border: "none",
    flexGrow: 1,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .paperBody": {
    padding: theme.spacing(2),
  },
  "& .item": theme.paper?.item ?? {},
}));

const PartyLedgerPage = ({
  intl,
  modulesManager,
  rights,
  partyLedgerBalance,
  accountingPeriods,
  fetchPartyLedgerBalance,
  resetPartyLedgerBalance,
}) => {
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [afterCursor, setAfterCursor] = useState(null);

  // The backend filters on the exact analytic value display name (there is no
  // id filter) and on the accounting period code.
  const periodCode = accountingPeriods.find((period) => period.id === selectedPeriodId)?.code ?? null;
  const partyName = selectedParty?.displayName ?? null;
  const hasSelectedFilters = !!(partyName && periodCode);

  const items = partyLedgerBalance?.items || [];
  const pageInfo = partyLedgerBalance?.pageInfo || {};
  const balanceInfo = useMemo(() => formatSignedBalance(items[0]?.balanceAmount ?? 0), [items]);

  // Any filter change restarts the pagination from the first page.
  useEffect(() => {
    setAfterCursor(null);
  }, [partyName, periodCode]);

  useEffect(() => {
    if (hasSelectedFilters) {
      fetchPartyLedgerBalance({
        displayName: partyName,
        periodCode,
        first: DEFAULT_PAGE_SIZE,
        after: afterCursor,
      });
    } else {
      // Clear any previously fetched rows as soon as one of the two filters is
      // removed, so a cleared filter never shows stale data.
      resetPartyLedgerBalance();
    }
  }, [fetchPartyLedgerBalance, resetPartyLedgerBalance, hasSelectedFilters, partyName, periodCode, afterCursor]);

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }


  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container className="paperBody">
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <PartyPicker value={selectedParty} onChange={setSelectedParty} />
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <AccountingPeriodPicker value={selectedPeriodId} onChange={setSelectedPeriodId} />
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          {!hasSelectedFilters ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">
                  {formatMessage(intl, "ledger", "ledger.partyLedgerPage.selectFiltersPrompt")}
                </Alert>
              </Box>
            </Grid>
          ) : (
            <>
              <Grid size={12}>
                <StyledPaper className="paper">
                  <Grid container alignItems="center" direction="row" className="paperHeader">
                    <Grid className="paperHeaderTitle">
                      <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.balanceTitle")}</Typography>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Box className="paperBody">
                    <Typography variant="h4">{formatAmount(modulesManager, intl, items[0]?.balanceAmount)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatMessage(intl, "ledger", `ledger.balance.${balanceInfo.legend}`)}
                    </Typography>
                  </Box>
                </StyledPaper>
              </Grid>

              <Grid size={12}>
                <StyledPaper className="paper">
                  <Grid container alignItems="center" direction="row" className="paperHeader">
                    <Grid className="paperHeaderTitle">
                      <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.statementTitle")}</Typography>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Box className="paperBody" sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            {formatMessage(intl, "ledger", "ledger.partyLedgerPage.periodColumn")}
                          </TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.debit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.credit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.balance")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              {formatMessage(intl, "ledger", "ledger.partyLedgerPage.emptyState")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>
                                {row.accountingPeriod?.code || row.accountingPeriod?.name || "-"}
                              </TableCell>
                              <TableCell>{formatAmount(modulesManager, intl, row.debitAmount ?? 0)}</TableCell>
                              <TableCell>{formatAmount(modulesManager, intl, row.creditAmount ?? 0)}</TableCell>
                              <TableCell>{formatAmount(modulesManager, intl, row.balanceAmount ?? 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <Grid container justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Grid>
                        <Typography variant="caption" color="text.secondary">
                          {formatMessageWithValues(intl, "ledger", "ledger.pagination.total", {
                            count: pageInfo.totalCount ?? 0,
                          })}
                        </Typography>
                      </Grid>
                      <Grid>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!afterCursor}
                          onClick={() => setAfterCursor(null)}
                          sx={{ mr: 1 }}
                        >
                          {formatMessage(intl, "ledger", "ledger.pagination.first")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!pageInfo.hasNextPage}
                          onClick={() => setAfterCursor(pageInfo.endCursor)}
                        >
                          {formatMessage(intl, "ledger", "ledger.pagination.next")}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </StyledPaper>
              </Grid>
            </>
          )}

          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" className="paperBody">
              {selectedParty?.displayName
                ? formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.selectedParty", {
                    party: selectedParty.displayName,
                  })
                : formatMessage(intl, "ledger", "ledger.partyLedgerPage.noPartySelected")}
              {" · "}
              {selectedPeriodId
                ? formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.selectedPeriod", {
                    period: selectedPeriodId,
                  })
                : formatMessage(intl, "ledger", "ledger.partyLedgerPage.noPeriodSelected")}
            </Typography>
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
});

const mapDispatchToProps = { fetchPartyLedgerBalance, resetPartyLedgerBalance };

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PartyLedgerPage)));
