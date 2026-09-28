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
  decodeId,
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
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);

  useEffect(() => {
    // Both arguments are required by the backend (`fetchFunderActivityReport`
    // is a single aggregate per funder AND accounting period).
    if (selectedFunder?.analyticValueId && selectedPeriodId) {
      fetchFunderActivityReport(decodeId(selectedFunder.analyticValueId), selectedPeriodId);
    }
  }, [fetchFunderActivityReport, selectedFunder?.analyticValueId, selectedPeriodId]);

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const displayReport = funderActivityReport?.data || null;

  const periodCaption = () => {
    const period = accountingPeriods.find((p) => p.id === selectedPeriodId);
    if (period) return `${period.startDate} — ${period.endDate}`;
    return selectedPeriodId ?? "-";
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
                  <AccountingPeriodPicker value={selectedPeriodId} onChange={setSelectedPeriodId} required />
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
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.debitAmount ?? 0)}</TableCell>
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.creditAmount ?? 0)}</TableCell>
                          <TableCell>{formatAmount(modulesManager, intl, displayReport?.balanceAmount ?? 0)}</TableCell>
                        </TableRow>
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
