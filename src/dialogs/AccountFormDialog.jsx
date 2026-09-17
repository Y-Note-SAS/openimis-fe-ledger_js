import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { injectIntl } from "react-intl";
import { GetIconComponent, formatMessage } from "@openimis/fe-core";
import AccountTypePicker from "../pickers/AccountTypePicker";
import { ledgerDialogTitleStyles } from "../utils/styles";
import { ACCOUNT_CODE_MAX_LENGTH, ACCOUNT_TYPE } from "../constants";

const CloseIcon = GetIconComponent("Close");

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  ...ledgerDialogTitleStyles(theme),
}));

const EMPTY_ACCOUNT = {
  name: "",
  code: "",
  fullCode: "",
  type: ACCOUNT_TYPE.ASSET,
  isBankAccount: false,
  currencies: [],
};

/* Single form for both creation and edition of a ledger account (ticket 37991).
   `account` is null when creating; the caller owns the mutation and passes
   `submitting`/`error` from the store, so a backend rejection stays visible in
   the dialog. */
const AccountFormDialog = ({
  intl,
  open,
  account,
  currencyOptions = [],
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const isEdit = Boolean(account);

  useEffect(() => {
    if (!open) return;
    setForm(
      account
        ? {
            name: account.name || "",
            code: account.code || "",
            fullCode: account.fullCode || "",
            type: account.type || ACCOUNT_TYPE.ASSET,
            isBankAccount: Boolean(account.isBankAccount),
            currencies: account.currencies || [],
          }
        : EMPTY_ACCOUNT,
    );
  }, [open, account]);

  const setAttribute = (attribute) => (value) => setForm((previous) => ({ ...previous, [attribute]: value }));

  // hordak enforces `bank_accounts_are_asset_accounts`: a bank account must be
  // an asset account, so ticking the box forces (and locks) the AS type.
  const setBankAccount = (checked) =>
    setForm((previous) => ({
      ...previous,
      isBankAccount: checked,
      type: checked ? ACCOUNT_TYPE.ASSET : previous.type,
    }));
  const canSave = Boolean(form.name && form.code && form.fullCode && form.type && form.currencies.length);

  const submit = () => {
    if (!canSave || submitting) return;
    onSubmit(form);
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="ledger-account-form-title"
    >
      <StyledDialogTitle id="ledger-account-form-title">
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>{formatMessage(intl, "ledger", `ledger.accounts.form.${isEdit ? "editTitle" : "createTitle"}`)}</Grid>
          <Grid>
            <IconButton
              onClick={onClose}
              size="small"
              disabled={submitting}
              aria-label={formatMessage(intl, "ledger", "ledger.accounts.form.close")}
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </Grid>
      </StyledDialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error">
            {formatMessage(intl, "ledger", "ledger.accounts.rejectionTitle")}: {error}
          </Alert>
        ) : null}
        <Grid container spacing={2}>
          <Grid size={6} className="item">
            <TextField
              required
              fullWidth
              variant="standard"
              label={formatMessage(intl, "ledger", "ledger.accounts.form.name")}
              value={form.name}
              onChange={(event) => setAttribute("name")(event.target.value)}
            />
          </Grid>
          <Grid size={6} className="item">
            <TextField
              required
              fullWidth
              variant="standard"
              label={formatMessage(intl, "ledger", "ledger.accounts.form.code")}
              value={form.code}
              onChange={(event) => setAttribute("code")(event.target.value)}
              inputProps={{ maxLength: ACCOUNT_CODE_MAX_LENGTH }}
            />
          </Grid>
          <Grid size={6} className="item">
            <TextField
              required
              fullWidth
              variant="standard"
              label={formatMessage(intl, "ledger", "ledger.accounts.form.fullCode")}
              value={form.fullCode}
              onChange={(event) => setAttribute("fullCode")(event.target.value)}
            />
          </Grid>
          <Grid size={6} className="item">
            <AccountTypePicker
              value={form.type}
              readOnly={form.isBankAccount}
              onChange={(value) => setAttribute("type")(value ?? ACCOUNT_TYPE.ASSET)}
            />
          </Grid>
          <Grid size={6} className="item">
            <Autocomplete
              multiple
              freeSolo
              openOnFocus
              options={currencyOptions}
              value={form.currencies}
              onChange={(_, newValue) => setAttribute("currencies")(newValue || [])}
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
          <Grid size={6} className="item">
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isBankAccount}
                  onChange={(event) => setBankAccount(event.target.checked)}
                  inputProps={{
                    "aria-label": formatMessage(intl, "ledger", "ledger.accounts.form.isBankAccount"),
                  }}
                />
              }
              label={formatMessage(intl, "ledger", "ledger.accounts.form.isBankAccount")}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting} variant="outlined">
          {formatMessage(intl, "ledger", "ledger.accounts.form.cancel")}
        </Button>
        <Button onClick={submit} disabled={!canSave || submitting} variant="contained">
          {formatMessage(intl, "ledger", isEdit ? "ledger.accounts.form.save" : "ledger.accounts.create.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { AccountFormDialog, EMPTY_ACCOUNT };
export default injectIntl(AccountFormDialog);
