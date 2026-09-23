import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Divider, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { GRID_RESPONSIVE_STANDARD, Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import ExportJobStatus from "../components/ExportJobStatus";
import { EXPORT_FORMAT } from "../constants";
import { hasLedgerAdminRight } from "../utils/permissions";
import {
  exportAccountingPeriod,
  fetchAccountingPeriods,
  pollExportJob,
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
}));

const PeriodExportPage = ({
  intl,
  rights,
  accountingPeriods,
  exportJobs,
  fetchAccountingPeriods: loadPeriods,
  exportAccountingPeriod: startExport,
  pollExportJob: startPolling,
}) => {
  const [periodId, setPeriodId] = useState(null);
  const [format, setFormat] = useState(EXPORT_FORMAT.GENERIC);
  const stopPollingRef = useRef(null);
  const periods = accountingPeriods?.items || [];
  const selectedPeriod = periods.find((period) => period.id === periodId);
  const job = periodId ? exportJobs?.byPeriodId?.[periodId] : null;
  const isAdmin = hasLedgerAdminRight(rights);

  useEffect(() => {
    if (isAdmin) {
      loadPeriods();
    }
    return () => stopPollingRef.current?.();
  }, [isAdmin, loadPeriods]);

  useEffect(() => {
    stopPollingRef.current?.();
    stopPollingRef.current = null;
  }, [periodId]);

  useEffect(() => {
    if (!job || job.status !== "in_progress" || !periodId) return undefined;
    stopPollingRef.current?.();
    stopPollingRef.current = startPolling(periodId);
    return () => stopPollingRef.current?.();
  }, [job?.status, periodId, startPolling]);

  if (!isAdmin) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const triggerExport = () => {
    if (!periodId) return;
    stopPollingRef.current?.();
    startExport(periodId, format);
    stopPollingRef.current = startPolling(periodId);
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.export.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.export.pageTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container direction="row" className="paperBody" spacing={2} alignItems="center">
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <AccountingPeriodPicker
                    value={periodId}
                    onChange={setPeriodId}
                    label={formatMessage(intl, "ledger", "ledger.export.period")}
                    required
                  />
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    label={formatMessage(intl, "ledger", "ledger.export.format")}
                    value={format}
                    onChange={(event) => setFormat(event.target.value)}
                    aria-label={formatMessage(intl, "ledger", "ledger.export.format")}
                  >
                    <MenuItem value={EXPORT_FORMAT.GENERIC}>
                      {formatMessage(intl, "ledger", "ledger.export.formats.generic")}
                    </MenuItem>
                    <MenuItem value={EXPORT_FORMAT.OHADA_FEC}>
                      {formatMessage(intl, "ledger", "ledger.export.formats.ohadaFec")}
                    </MenuItem>
                  </TextField>
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <Button variant="contained" disabled={!selectedPeriod || !format} onClick={triggerExport}>
                    {formatMessage(intl, "ledger", "ledger.export.trigger")}
                  </Button>
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          {exportJobs?.error ? (
            <Grid size={12}>
              <Alert severity="error">{exportJobs.error}</Alert>
            </Grid>
          ) : null}

          {job ? (
            <Grid size={12}>
              <StyledPaper className="paper">
                <Grid container alignItems="center" direction="row" className="paperHeader">
                  <Grid className="paperHeaderTitle">
                    <Typography>{formatMessage(intl, "ledger", "ledger.export.resultTitle")}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Box className="paperBody">
                  <ExportJobStatus job={job} />
                </Box>
              </StyledPaper>
            </Grid>
          ) : null}
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  accountingPeriods: state.ledger?.accountingPeriods,
  exportJobs: state.ledger?.exportJobs,
});

const mapDispatchToProps = {
  fetchAccountingPeriods,
  exportAccountingPeriod,
  pollExportJob,
};

export { PeriodExportPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PeriodExportPage)));
