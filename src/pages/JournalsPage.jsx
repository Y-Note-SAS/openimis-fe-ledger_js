import React, { useEffect, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { Alert, Box, Button, Divider, Grid, Paper, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { GRID_RESPONSIVE_STANDARD, Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";
import AccountPicker from "../pickers/AccountPicker";
import JournalTypePicker from "../pickers/JournalTypePicker";
import JournalsSearcher from "../components/JournalsSearcher";
import { hasLedgerAdminRight, hasLedgerReportingRight } from "../utils/permissions";
import { createJournal } from "../actions";

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

const JournalsPage = ({ intl, rights, journalMutation, createJournal: saveJournal }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [journalType, setJournalType] = useState(null);
  const [defaultDebitAccount, setDefaultDebitAccount] = useState(null);
  const [defaultCreditAccount, setDefaultCreditAccount] = useState(null);
  const [searcherKey, setSearcherKey] = useState(0);

  const canRead = hasLedgerReportingRight(rights);
  const isAdmin = hasLedgerAdminRight(rights);
  const submitting = journalMutation?.submitting || false;
  const mutationError = journalMutation?.error || null;

  const canSave = Boolean(name && code && journalType && defaultDebitAccount?.uuid && defaultCreditAccount?.uuid);

  const submit = () => {
    if (!canSave || submitting) return;
    saveJournal({
      name,
      code,
      journalType,
      defaultDebitAccount,
      defaultCreditAccount,
      clientMutationLabel: formatMessage(intl, "ledger", "ledger.journals.create.mutationLabel"),
    });
  };

  // The mutation answers with the mutation ids only: refresh the paginated list
  // (Searcher remount => back to page 0) and clear the form on success.
  useEffect(() => {
    if (!journalMutation?.lastCreatedAt) return;
    setName("");
    setCode("");
    setJournalType(null);
    setDefaultDebitAccount(null);
    setDefaultCreditAccount(null);
    setSearcherKey((key) => key + 1);
  }, [journalMutation?.lastCreatedAt]);

  // Only hook-free rendering happens below: the access check must stay after
  // every hook so the hook order never changes between renders.
  if (!canRead) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.journals.pageTitle")} />
        <Grid container direction="column">
          {isAdmin ? (
            <Grid size={12}>
              <StyledPaper className="paper">
                <Grid container alignItems="center" direction="row" className="paperHeader">
                  <Grid className="paperHeaderTitle">
                    <Typography>{formatMessage(intl, "ledger", "ledger.journals.create.title")}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Grid container alignItems="center" direction="row" className="paperBody" spacing={2}>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <TextField
                      required
                      fullWidth
                      variant="standard"
                      label={formatMessage(intl, "ledger", "ledger.journals.form.name")}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <TextField
                      required
                      fullWidth
                      variant="standard"
                      label={formatMessage(intl, "ledger", "ledger.journals.form.code")}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <JournalTypePicker value={journalType} onChange={setJournalType} />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <AccountPicker
                      label={formatMessage(intl, "ledger", "ledger.journals.form.defaultDebitAccount")}
                      value={defaultDebitAccount}
                      onChange={setDefaultDebitAccount}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <AccountPicker
                      label={formatMessage(intl, "ledger", "ledger.journals.form.defaultCreditAccount")}
                      value={defaultCreditAccount}
                      onChange={setDefaultCreditAccount}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                    <Button variant="contained" disabled={!canSave || submitting} onClick={submit}>
                      {formatMessage(intl, "ledger", "ledger.journals.create.submit")}
                    </Button>
                  </Grid>
                </Grid>
              </StyledPaper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">{formatMessage(intl, "ledger", "ledger.journals.adminOnlyNotice")}</Alert>
              </Box>
            </Grid>
          )}

          {mutationError ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="error">
                  {formatMessage(intl, "ledger", "ledger.journals.rejectionTitle")}: {mutationError}
                </Alert>
              </Box>
            </Grid>
          ) : null}

          <Grid size={12}>
            <JournalsSearcher key={searcherKey} />
          </Grid>
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  journalMutation: state.ledger?.journalMutation,
});

const mapDispatchToProps = {
  createJournal,
};

export { JournalsPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(JournalsPage)));
