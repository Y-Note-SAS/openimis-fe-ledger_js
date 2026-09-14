import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { GRID_RESPONSIVE_STANDARD, Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";
import AccountTypePicker from "../pickers/AccountTypePicker";
import AccountsSearcher from "../components/AccountsSearcher";
import { ACCOUNT_TYPE, DEFAULT_CURRENCY_CODE } from "../constants";
import { collectCurrencyCodes } from "../utils/currencies";
import { hasLedgerAdminRight, hasLedgerReportingRight } from "../utils/permissions";
import { createAccount, fetchAccountOptions, fetchLedgerDeploymentConfiguration } from "../actions";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...(theme?.paper?.paper ?? {}),
  // `theme.paper.paper` carries a margin while the Searcher panels below only
  // get `theme.paper.body`: drop it horizontally so both edges line up.
  marginLeft: 0,
  marginRight: 0,
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

const AccountsPage = ({
  intl,
  rights,
  accountMutation,
  accountOptions,
  deploymentConfiguration,
  createAccount: saveAccount,
  fetchAccountOptions: loadAccountOptions,
  fetchLedgerDeploymentConfiguration: loadDeploymentConfiguration,
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fullCode, setFullCode] = useState("");
  const [type, setType] = useState(ACCOUNT_TYPE.ASSET);
  const [isBankAccount, setIsBankAccount] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [searcherKey, setSearcherKey] = useState(0);

  const canRead = hasLedgerReportingRight(rights);
  const isAdmin = hasLedgerAdminRight(rights);
  const submitting = accountMutation?.submitting || false;
  const mutationError = accountMutation?.error || null;
  const configuredCurrency = deploymentConfiguration?.data?.currencyCode || DEFAULT_CURRENCY_CODE;

  // `rights` may arrive after the first render (core user fetched
  // asynchronously), hence the dependency on the resolved flag rather than an
  // empty dependency array: the reference data must still be loaded once the
  // access is known. The loaders are stable bound actions.
  useEffect(() => {
    if (!canRead) return;
    loadAccountOptions();
    loadDeploymentConfiguration();
  }, [canRead, loadAccountOptions, loadDeploymentConfiguration]);

  // The instance currency (deployment configuration, XAF by default) is the
  // default value; the codes already used by the chart of accounts are offered
  // as suggestions and any other ISO code can be typed in.
  const currencyOptions = useMemo(
    () => Array.from(new Set([configuredCurrency, ...collectCurrencyCodes(accountOptions?.items)].filter(Boolean))),
    [configuredCurrency, accountOptions?.items],
  );

  const canSave = Boolean(name && code && fullCode && type && currencies.length);

  const submit = () => {
    if (!canSave || submitting) return;
    saveAccount({
      name,
      code,
      fullCode,
      type,
      isBankAccount,
      currencies,
      clientMutationLabel: formatMessage(intl, "ledger", "ledger.accounts.create.mutationLabel"),
    });
  };

  // The mutation answers with the mutation ids only: refresh the paginated
  // list (Searcher remount => back to page 0) and clear the form on success.
  useEffect(() => {
    if (!accountMutation?.lastCreatedAt) return;
    setName("");
    setCode("");
    setFullCode("");
    setType(ACCOUNT_TYPE.ASSET);
    setIsBankAccount(false);
    setCurrencies([]);
    setSearcherKey((key) => key + 1);
  }, [accountMutation?.lastCreatedAt]);

  // Only hook-free rendering happens below: the access check must stay after
  // every hook so the hook order never changes between renders.
  if (!canRead) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.accounts.pageTitle")} />
        <Grid container direction="column">
          {isAdmin ? (
            <Grid size={12}>
              <StyledPaper className="paper">
                <Grid container alignItems="center" direction="row" className="paperHeader">
                  <Grid className="paperHeaderTitle">
                    <Typography>{formatMessage(intl, "ledger", "ledger.accounts.create.title")}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Grid container alignItems="center" direction="row" className="paperBody" spacing={2}>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <TextField
                      required
                      fullWidth
                      variant="standard"
                      label={formatMessage(intl, "ledger", "ledger.accounts.form.name")}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <TextField
                      required
                      fullWidth
                      variant="standard"
                      label={formatMessage(intl, "ledger", "ledger.accounts.form.code")}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <TextField
                      required
                      fullWidth
                      variant="standard"
                      label={formatMessage(intl, "ledger", "ledger.accounts.form.fullCode")}
                      value={fullCode}
                      onChange={(event) => setFullCode(event.target.value)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <AccountTypePicker value={type} onChange={(value) => setType(value ?? ACCOUNT_TYPE.ASSET)} />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <Autocomplete
                      multiple
                      freeSolo
                      openOnFocus
                      options={currencyOptions}
                      value={currencies}
                      onChange={(_, newValue) => setCurrencies(newValue || [])}
                      getOptionLabel={(option) => option || ""}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="standard"
                          label={formatMessage(intl, "ledger", "ledger.accounts.form.currencies")}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isBankAccount}
                          onChange={(event) => setIsBankAccount(event.target.checked)}
                          inputProps={{
                            "aria-label": formatMessage(intl, "ledger", "ledger.accounts.form.isBankAccount"),
                          }}
                        />
                      }
                      label={formatMessage(intl, "ledger", "ledger.accounts.form.isBankAccount")}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <Button variant="contained" disabled={!canSave || submitting} onClick={submit}>
                      {formatMessage(intl, "ledger", "ledger.accounts.create.submit")}
                    </Button>
                  </Grid>
                </Grid>
              </StyledPaper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">{formatMessage(intl, "ledger", "ledger.accounts.adminOnlyNotice")}</Alert>
              </Box>
            </Grid>
          )}

          {mutationError ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="error">
                  {formatMessage(intl, "ledger", "ledger.accounts.rejectionTitle")}: {mutationError}
                </Alert>
              </Box>
            </Grid>
          ) : null}

          <Grid size={12}>
            <AccountsSearcher key={searcherKey} />
          </Grid>
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  accountMutation: state.ledger?.accountMutation,
  accountOptions: state.ledger?.accountOptions,
  deploymentConfiguration: state.ledger?.deploymentConfiguration,
});

const mapDispatchToProps = {
  createAccount,
  fetchAccountOptions,
  fetchLedgerDeploymentConfiguration,
};

export { AccountsPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountsPage)));
