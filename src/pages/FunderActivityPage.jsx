import React, { useEffect, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import {
  Alert,
  Box,
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
} from "@openimis/fe-core";
import FunderPicker from "../pickers/FunderPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import { hasLedgerReportingRight } from "../utils/permissions";
import { fetchFunderActivityReport } from "../actions";

const MOCK_FUNDER_ACTIVITY = {
  analyticValueId: "GIZ",
  accountingPeriodRange: { start: "2026-07-01", end: "2026-07-31" },
  debitTotal: 12500,
  creditTotal: 7800,
  balance: 4700,
  byCategory: [
    { category: "claim_payment", debit: 12500, credit: 0, balance: 12500 },
    { category: "invoice", debit: 0, credit: 7800, balance: -7800 },
  ],
};

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

const FunderActivityPage = ({ intl, rights, funderActivityReport, fetchFunderActivityReport }) => {
  const [selectedFunder, setSelectedFunder] = useState(null);
  const [periodStartId, setPeriodStartId] = useState(null);
  const [periodEndId, setPeriodEndId] = useState(null);

  useEffect(() => {
    if (selectedFunder?.analyticValueId) {
      fetchFunderActivityReport(selectedFunder.analyticValueId, {
        start: periodStartId,
        end: periodEndId,
      });
    }
  }, [fetchFunderActivityReport, selectedFunder?.analyticValueId, periodStartId, periodEndId]);

  if (!hasLedgerReportingRight(rights)) {
    return null;
  }

  const reportData = funderActivityReport?.data || null;
  const useMockReport =
    !!selectedFunder?.analyticValueId && (!reportData || (reportData.byCategory || []).length === 0);
  const displayReport = useMockReport ? MOCK_FUNDER_ACTIVITY : reportData;
  const byCategory = displayReport?.byCategory || [];

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.funderActivityPage.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.funderActivityPage.pageTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container className="paperBody">
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <FunderPicker value={selectedFunder} onChange={setSelectedFunder} />
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <AccountingPeriodPicker
                    label={formatMessage(intl, "ledger", "ledger.funderActivityPage.periodStart")}
                    value={periodStartId}
                    onChange={setPeriodStartId}
                    withNull
                  />
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <AccountingPeriodPicker
                    label={formatMessage(intl, "ledger", "ledger.funderActivityPage.periodEnd")}
                    value={periodEndId}
                    onChange={setPeriodEndId}
                    withNull
                  />
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          {!selectedFunder ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">
                  {formatMessage(intl, "ledger", "ledger.funderActivityPage.noFunderSelected")}
                </Alert>
              </Box>
            </Grid>
          ) : (
            <>
              {useMockReport ? (
                <Grid size={12}>
                  <Box className="paperBody">
                    <Alert severity="info">
                      Demo data shown until the real backend response is available for this funder and period range.
                    </Alert>
                  </Box>
                </Grid>
              ) : null}

              <Grid size={12}>
                <StyledPaper className="paper">
                  <Grid container alignItems="center" direction="row" className="paperHeader">
                    <Grid className="paperHeaderTitle">
                      <Typography>{formatMessage(intl, "ledger", "ledger.funderActivityPage.totalsTitle")}</Typography>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Box className="paperBody" sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.debit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.credit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.balance")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{displayReport?.debitTotal ?? 0}</TableCell>
                          <TableCell>{displayReport?.creditTotal ?? 0}</TableCell>
                          <TableCell>{displayReport?.balance ?? 0}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                </StyledPaper>
              </Grid>

              <Grid size={12}>
                <StyledPaper className="paper">
                  <Grid container alignItems="center" direction="row" className="paperHeader">
                    <Grid className="paperHeaderTitle">
                      <Typography>
                        {formatMessage(intl, "ledger", "ledger.funderActivityPage.byCategoryTitle")}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Divider />
                  <Box className="paperBody" sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.funderActivityPage.category")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.debit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.credit")}</TableCell>
                          <TableCell>{formatMessage(intl, "ledger", "ledger.entry.balance")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {byCategory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              {formatMessage(intl, "ledger", "ledger.funderActivityPage.emptyByCategory")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          byCategory.map((row) => (
                            <TableRow key={row.category}>
                              <TableCell>{row.category}</TableCell>
                              <TableCell>{row.debit ?? 0}</TableCell>
                              <TableCell>{row.credit ?? 0}</TableCell>
                              <TableCell>{row.balance ?? 0}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </StyledPaper>
              </Grid>

              <Grid size={12}>
                <Typography variant="caption" color="text.secondary" className="paperBody">
                  {formatMessageWithValues(intl, "ledger", "ledger.funderActivityPage.selectedFunder", {
                    funder: selectedFunder.displayName,
                  })}
                  {" · "}
                  {periodStartId || periodEndId
                    ? `${periodStartId ?? "-"} — ${periodEndId ?? "-"}`
                    : formatMessage(intl, "ledger", "ledger.funderActivityPage.allPeriods")}
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  funderActivityReport: state.ledger.funderActivityReport,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchFunderActivityReport }, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(FunderActivityPage)));
