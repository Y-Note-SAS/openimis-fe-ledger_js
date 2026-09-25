import React, { useEffect, useRef, useState } from "react";
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
import {
  GRID_RESPONSIVE_STANDARD,
  Helmet,
  PublishedComponent,
  journalize,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
} from "@openimis/fe-core";
import AccountingPeriodStatusBadge from "../components/AccountingPeriodStatusBadge";
import { availableActionsForPeriod } from "../utils/periodActions";
import { validateNewAccountingPeriod } from "../utils/periodValidation";
import { hasLedgerReportingRight, hasLedgerAdminRight } from "../utils/permissions";
import { ACCOUNTING_PERIOD_STATUS, PERIOD_ACTION } from "../constants";
import {
  fetchAccountingPeriods,
  openAccountingPeriod,
  lockAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
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
  mutation,
  submittingMutation,
  journalize,
  fetchAccountingPeriods,
  openAccountingPeriod,
  lockAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
}) => {
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    fetchAccountingPeriods();
  }, [fetchAccountingPeriods]);

  // Once a lifecycle mutation completes, hand it to the JournalDrawer (right
  // panel) — standard openIMIS mutation journaling. The previous value must be
  // compared *before* being stored, otherwise the true -> false transition is
  // missed and nothing is ever journalized.
  const prevSubmittingMutationRef = useRef(false);
  useEffect(() => {
    const wasSubmitting = prevSubmittingMutationRef.current;
    prevSubmittingMutationRef.current = submittingMutation;
    if (wasSubmitting && !submittingMutation) {
      journalize(mutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittingMutation]);

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const isAdmin = hasLedgerAdminRight(rights);
  const periods = accountingPeriods?.items || [];
  // The status filter only affects what is displayed; availableActionsForPeriod
  // always receives the full loaded list so the action buttons stay correct.
  const visiblePeriods = statusFilter ? periods.filter((period) => period.status === statusFilter) : periods;
  const submitting = periodMutation?.submitting || false;
  const mutationError = periodMutation?.error || periodMutation?.lastRejectionReason || null;

  // The mutation payload only carries ids, so the list is refreshed once the
  // mutation settles (a failed transition simply refetches the same list).
  const refreshAfter = (mutation) => Promise.resolve(mutation).then(() => fetchAccountingPeriods());

  // The mutation label is what the JournalDrawer displays: it goes through the
  // module translations rather than the action's English default.
  const mutationLabel = (action) => formatMessage(intl, "ledger", `ledger.periods.mutationLabel.${action}`);

  const runAction = (period, action) => {
    if (action === PERIOD_ACTION.LOCK) refreshAfter(lockAccountingPeriod(period.id, mutationLabel(PERIOD_ACTION.LOCK)));
    if (action === PERIOD_ACTION.CLOSE)
      refreshAfter(closeAccountingPeriod(period.id, mutationLabel(PERIOD_ACTION.CLOSE)));
    if (action === PERIOD_ACTION.REOPEN)
      refreshAfter(reopenAccountingPeriod(period.id, mutationLabel(PERIOD_ACTION.REOPEN)));
  };

  // Mirror of the backend rules (`PeriodService.open`): an overlapping period or
  // one that does not start after the latest existing period is refused by the
  // server, so it must not be submittable here either (the backend answer is
  // still displayed if it slips through).
  const openPeriodValidation = validateNewAccountingPeriod(newStartDate, newEndDate, periods);

  const openPeriod = () => {
    if (newStartDate && newEndDate && !openPeriodValidation) {
      refreshAfter(openAccountingPeriod(newStartDate, newEndDate, mutationLabel(PERIOD_ACTION.OPEN)));
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
                    <Button
                      variant="contained"
                      disabled={!newStartDate || !newEndDate || !!openPeriodValidation || submitting}
                      onClick={openPeriod}
                    >
                      {formatMessage(intl, "ledger", "ledger.periods.action.open")}
                    </Button>
                  </Grid>
                  {openPeriodValidation ? (
                    <Grid size={12} className="item">
                      <Alert severity="warning">
                        {formatMessageWithValues(intl, "ledger", openPeriodValidation.key, openPeriodValidation.values)}
                      </Alert>
                    </Grid>
                  ) : null}
                </Grid>
              </StyledPaper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">{formatMessage(intl, "ledger", "ledger.periods.adminOnlyNotice")}</Alert>
              </Box>
            </Grid>
          )}

          {mutationError ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="error">
                  {formatMessage(intl, "ledger", "ledger.periods.rejectionTitle")}: {mutationError}
                </Alert>
              </Box>
            </Grid>
          ) : null}

          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>
                    {formatMessageWithValues(intl, "ledger", "ledger.periods.tableTitle", {
                      count: visiblePeriods.length,
                    })}
                  </Typography>
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
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  accountingPeriods: state.ledger.accountingPeriods,
  periodMutation: state.ledger.periodMutation,
  mutation: state.ledger.mutation,
  submittingMutation: state.ledger.submittingMutation,
});

const mapDispatchToProps = {
  journalize,
  fetchAccountingPeriods,
  openAccountingPeriod,
  lockAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountingPeriodsPage)));
