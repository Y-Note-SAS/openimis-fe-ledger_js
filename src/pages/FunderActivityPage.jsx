import React, { useEffect, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
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
  formatAmount,
} from "@openimis/fe-core";
import FunderPicker from "../pickers/FunderPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import { hasLedgerReportingRight } from "../utils/permissions";
import { fetchFunderActivityReport } from "../actions";

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

const FunderActivityPage = ({
  intl,
  modulesManager,
  rights,
  funderActivityReport,
  accountingPeriods,
  fetchFunderActivityReport,
}) => {
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
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const reportData = funderActivityReport?.data || null;
  const displayReport = reportData;
  const byCategory = displayReport?.byCategory || [];

  const periodCaption = () => {
    if (!periodStartId && !periodEndId) {
      return formatMessage(intl, "ledger", "ledger.funderActivityPage.allPeriods");
    }
    const startPeriod = accountingPeriods.find((p) => p.id === periodStartId);
    const endPeriod = accountingPeriods.find((p) => p.id === periodEndId);
    if (startPeriod && endPeriod) {
      const [earlier, later] =
        startPeriod.startDate <= endPeriod.startDate ? [startPeriod, endPeriod] : [endPeriod, startPeriod];
      return `${earlier.startDate} — ${later.endDate}`;
    }
    if (startPeriod) return `${startPeriod.startDate} — ${startPeriod.endDate}`;
    if (endPeriod) return `${endPeriod.startDate} — ${endPeriod.endDate}`;
    return `${periodStartId ?? "-"} — ${periodEndId ?? "-"}`;
  };

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
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.debitTotal ?? 0)}</TableCell>
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.creditTotal ?? 0)}</TableCell>
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.balance ?? 0)}</TableCell>
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
                              <TableCell>{formatAmount(modulesManager, intl, row.debit ?? 0)}</TableCell>
                              <TableCell>{formatAmount(modulesManager, intl, row.credit ?? 0)}</TableCell>
                              <TableCell>{formatAmount(modulesManager, intl, row.balance ?? 0)}</TableCell>
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
                  {periodCaption()}
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
  accountingPeriods: state.ledger.accountingPeriods?.items || [],
});

const mapDispatchToProps = { fetchFunderActivityReport };

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(FunderActivityPage)));
