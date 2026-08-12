import React, { useEffect, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { GRID_RESPONSIVE_STANDARD, Helmet, PublishedComponent, withModulesManager, formatMessage } from "@openimis/fe-core";
import AccountingPeriodStatusBadge from "../components/AccountingPeriodStatusBadge";
import { availableActionsForPeriod } from "../utils/periodActions";
import { hasLedgerReportingRight, hasLedgerAdminRight } from "../utils/permissions";
import { ACCOUNTING_PERIOD_STATUS, PERIOD_ACTION } from "../constants";
import {
  fetchAccountingPeriodsMock,
  openAccountingPeriodMock,
  lockAccountingPeriodMock,
  closeAccountingPeriodMock,
  reopenAccountingPeriodMock,
} from "../actions";

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

const AccountingPeriodsPage = ({
  intl,
  rights,
  accountingPeriods,
  periodMutation,
  fetchAccountingPeriodsMock,
  openAccountingPeriodMock,
  lockAccountingPeriodMock,
  closeAccountingPeriodMock,
  reopenAccountingPeriodMock,
}) => {
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    fetchAccountingPeriodsMock();
  }, [fetchAccountingPeriodsMock]);

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  } 

  const isAdmin = hasLedgerAdminRight(rights);
  const periods = accountingPeriods?.items || [];
  // The status filter only affects what is displayed; availableActionsForPeriod
  // always receives the full loaded list so the action buttons stay correct.
  const visiblePeriods = statusFilter ? periods.filter((period) => period.status === statusFilter) : periods;
  const submitting = periodMutation?.submitting || false;
  const rejectionReason = periodMutation?.lastRejectionReason || null;

  const runAction = (period, action) => {
    if (action === PERIOD_ACTION.LOCK) lockAccountingPeriodMock(period.id);
    if (action === PERIOD_ACTION.CLOSE) closeAccountingPeriodMock(period.id);
    if (action === PERIOD_ACTION.REOPEN) reopenAccountingPeriodMock(period.id);
  };

  const openPeriod = () => {
    if (newStartDate && newEndDate) {
      openAccountingPeriodMock(newStartDate, newEndDate);
    }
  };

  const actionCell = (period) => {
    if (!isAdmin) {
      return (
        <Typography variant="caption" color="text.secondary">
          {formatMessage(intl, "ledger", "ledger.periods.actionUnavailable")}
        </Typography>
      );
    }
    const actions = availableActionsForPeriod(period, periods);
    if (!actions.length) {
      return (
        <Typography variant="caption" color="text.secondary">
          {formatMessage(intl, "ledger", "ledger.periods.actionUnavailable")}
        </Typography>
      );
    }
    return actions.map((action) => (
      <Button
        key={action}
        size="small"
        variant="outlined"
        disabled={submitting}
        onClick={() => runAction(period, action)}
      >
        {formatMessage(intl, "ledger", `ledger.periods.action.${action}`)}
      </Button>
    ));
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.periods.pageTitle")} />
        <Grid container direction="column">
          {isAdmin ? (
            <Grid size={12}>
              <StyledPaper className="paper">
                <Grid container alignItems="center" direction="row" className="paperHeader">
                  <Grid className="paperHeaderTitle">
                    <Typography>{formatMessage(intl, "ledger", "ledger.periods.openForm.title")}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Grid container alignItems="center" direction="row" className="paperBody">
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <PublishedComponent
                      pubRef="core.DatePicker"
                      module="ledger"
                      label="ledger.periods.openForm.startDate"
                      value={newStartDate}
                      maxDate={newEndDate || undefined}
                      onChange={setNewStartDate}
                      required
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <PublishedComponent
                      pubRef="core.DatePicker"
                      module="ledger"
                      label="ledger.periods.openForm.endDate"
                      value={newEndDate}
                      minDate={newStartDate || undefined}
                      onChange={setNewEndDate}
                      required
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <Button variant="contained" disabled={!newStartDate || !newEndDate || submitting} onClick={openPeriod}>
                      {formatMessage(intl, "ledger", "ledger.periods.action.open")}
                    </Button>
                  </Grid>
                </Grid>
              </StyledPaper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">
                  {formatMessage(intl, "ledger", "ledger.periods.adminOnlyNotice")}
                </Alert>
              </Box>
            </Grid>
          )}

          {rejectionReason ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="error">
                  {formatMessage(intl, "ledger", "ledger.periods.rejectionTitle")}: {rejectionReason}
                </Alert>
              </Box>
            </Grid>
          ) : null}

          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.periods.pageTitle")}</Typography>
                </Grid>
                <Grid>
                  <Select
                    size="small"
                    value={statusFilter ?? ""}
                    displayEmpty
                    onChange={(event) => setStatusFilter(event.target.value || null)}
                    inputProps={{ "aria-label": formatMessage(intl, "ledger", "ledger.periods.filter.status") }}
                  >
                    <MenuItem value="">{formatMessage(intl, "ledger", "ledger.periods.filter.all")}</MenuItem>
                    {Object.values(ACCOUNTING_PERIOD_STATUS).map((status) => (
                      <MenuItem key={status} value={status}>
                        {formatMessage(intl, "ledger", `ledger.periods.status.${status}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
              <Divider />
              <Box className="paperBody" sx={{ overflowX: "auto" }}>
                {periods.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {formatMessage(intl, "ledger", "ledger.periods.empty")}
                  </Typography>
                ) : visiblePeriods.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {formatMessage(intl, "ledger", "ledger.periods.filter.noResults")}
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.periods.table.period")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.periods.table.status")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.periods.table.actions")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visiblePeriods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell>
                            {period.startDate} — {period.endDate}
                          </TableCell>
                          <TableCell>
                            <AccountingPeriodStatusBadge status={period.status} />
                          </TableCell>
                          <TableCell>{actionCell(period)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </StyledPaper>
          </Grid>
        </Grid>
      </div>
    </StyledPage>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  accountingPeriods: state.ledger.accountingPeriods,
  periodMutation: state.ledger.periodMutation,
});

const mapDispatchToProps = {
  fetchAccountingPeriodsMock,
  openAccountingPeriodMock,
  lockAccountingPeriodMock,
  closeAccountingPeriodMock,
  reopenAccountingPeriodMock,
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountingPeriodsPage)));
