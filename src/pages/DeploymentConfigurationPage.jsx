import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Divider, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { GRID_RESPONSIVE_STANDARD, Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";
import ForwardOnlyModeWarningDialog from "../components/ForwardOnlyModeWarningDialog";
import { OPERATING_MODE } from "../constants";
import { hasLedgerAdminRight } from "../utils/permissions";
import {
  configureDeployment,
  fetchLedgerDeploymentReferenceData,
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

const DeploymentConfigurationPage = ({
  intl,
  rights,
  deploymentConfiguration,
  externalSystems,
  currencyCodes,
  chartOfAccounts,
  fetchLedgerDeploymentReferenceData: loadReferenceData,
  configureDeployment: saveDeployment,
}) => {
  const [operatingMode, setOperatingMode] = useState(OPERATING_MODE.LOCAL_ONLY);
  const [externalSystem, setExternalSystem] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState("");
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const isAdmin = hasLedgerAdminRight(rights);

  useEffect(() => {
    if (isAdmin) {
      loadReferenceData();
    }
  }, [isAdmin, loadReferenceData]);

  useEffect(() => {
    const data = deploymentConfiguration?.data;
    if (!data) return;
    setOperatingMode(data.operatingMode || OPERATING_MODE.LOCAL_ONLY);
    setExternalSystem(data.externalSystem || "");
    setCurrencyCode(data.currencyCode || "");
    setRetainedEarningsAccountId(data.retainedEarningsAccount?.id || "");
  }, [deploymentConfiguration?.data]);

  const currentOperatingMode =
    deploymentConfiguration?.data?.operatingMode || OPERATING_MODE.LOCAL_ONLY;
  const submitting = deploymentConfiguration?.submitting || false;
  const error = deploymentConfiguration?.error;
  const systems = externalSystems?.items || [];
  const currencies = currencyCodes?.items || [];
  const accounts = chartOfAccounts?.items || [];
  const canSave = Boolean(currencyCode && retainedEarningsAccountId && (operatingMode !== OPERATING_MODE.REPLICATED || externalSystem));

  const modeOptions = useMemo(
    () => [
      {
        value: OPERATING_MODE.LOCAL_ONLY,
        label: formatMessage(intl, "ledger", "ledger.deployment.operatingModes.localOnly"),
      },
      {
        value: OPERATING_MODE.REPLICATED,
        label: formatMessage(intl, "ledger", "ledger.deployment.operatingModes.replicated"),
      },
    ],
    [intl],
  );

  if (!isAdmin) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const submit = () => {
    if (!canSave) return;
    if (operatingMode !== currentOperatingMode) {
      setPendingSave(true);
      setWarningOpen(true);
      return;
    }
    saveDeployment(operatingMode, externalSystem || null, currencyCode, retainedEarningsAccountId);
  };

  const confirmModeChange = () => {
    setWarningOpen(false);
    if (!pendingSave) return;
    setPendingSave(false);
    saveDeployment(operatingMode, externalSystem || null, currencyCode, retainedEarningsAccountId);
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.deployment.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.deployment.pageTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container direction="row" className="paperBody" spacing={2} alignItems="center">
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    label={formatMessage(intl, "ledger", "ledger.deployment.operatingMode")}
                    value={operatingMode}
                    onChange={(event) => setOperatingMode(event.target.value)}
                  >
                    {modeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    label={formatMessage(intl, "ledger", "ledger.deployment.externalSystem")}
                    value={externalSystem}
                    onChange={(event) => setExternalSystem(event.target.value)}
                    disabled={operatingMode !== OPERATING_MODE.REPLICATED}
                  >
                    {systems.map((system) => (
                      <MenuItem key={system.code} value={system.code}>
                        {system.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    label={formatMessage(intl, "ledger", "ledger.deployment.currencyCode")}
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.label} ({currency.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    label={formatMessage(intl, "ledger", "ledger.deployment.retainedEarningsAccount")}
                    value={retainedEarningsAccountId}
                    onChange={(event) => setRetainedEarningsAccountId(event.target.value)}
                  >
                    {accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <Button variant="contained" disabled={!canSave || submitting} onClick={submit}>
                    {formatMessage(intl, "ledger", "ledger.deployment.save")}
                  </Button>
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          {error ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="error">{error}</Alert>
              </Box>
            </Grid>
          ) : null}
        </Grid>
        <ForwardOnlyModeWarningDialog
          open={warningOpen}
          onCancel={() => {
            setWarningOpen(false);
            setPendingSave(false);
          }}
          onConfirm={confirmModeChange}
          submitting={submitting}
        />
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  deploymentConfiguration: state.ledger?.deploymentConfiguration,
  externalSystems: state.ledger?.externalSystems,
  currencyCodes: state.ledger?.currencyCodes,
  chartOfAccounts: state.ledger?.chartOfAccounts,
});

const mapDispatchToProps = {
  fetchLedgerDeploymentReferenceData,
  configureDeployment,
};

export { DeploymentConfigurationPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(DeploymentConfigurationPage)));
