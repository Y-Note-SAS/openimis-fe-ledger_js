import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { injectIntl } from "react-intl";
import { GetIconComponent, formatMessage } from "@openimis/fe-core";
import { mutationMessage } from "../utils/mutationMessages";
import AccountPicker from "../pickers/AccountPicker";
import JournalTypePicker from "../pickers/JournalTypePicker";
import { ledgerDialogTitleStyles } from "../utils/styles";

const CloseIcon = GetIconComponent("Close");

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  ...ledgerDialogTitleStyles(theme),
}));

const EMPTY_JOURNAL = {
  name: "",
  code: "",
  journalType: null,
  defaultDebitAccount: null,
  defaultCreditAccount: null,
};

/* Single form for both creation and edition of a journal (ticket 37990).
   `journal` is null when creating; the caller owns the mutation and passes
   `submitting`/`error` from the store, so a backend rejection stays visible in
   the dialog. */
const JournalFormDialog = ({ intl, open, journal, submitting = false, error = null, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_JOURNAL);
  const isEdit = Boolean(journal);

  useEffect(() => {
    if (!open) return;
    setForm(
      journal
        ? {
            name: journal.name || "",
            code: journal.code || "",
            journalType: journal.type || null,
            defaultDebitAccount: journal.defaultDebitAccountId || null,
            defaultCreditAccount: journal.defaultCreditAccountId || null,
          }
        : EMPTY_JOURNAL,
    );
  }, [open, journal]);

  const setAttribute = (attribute) => (value) => setForm((previous) => ({ ...previous, [attribute]: value }));
  const canSave = Boolean(
    form.name && form.code && form.journalType && form.defaultDebitAccount?.uuid && form.defaultCreditAccount?.uuid,
  );

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
      aria-labelledby="ledger-journal-form-title"
    >
      <StyledDialogTitle id="ledger-journal-form-title">
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>{formatMessage(intl, "ledger", `ledger.journals.form.${isEdit ? "editTitle" : "createTitle"}`)}</Grid>
          <Grid>
            <IconButton
              onClick={onClose}
              size="small"
              disabled={submitting}
              aria-label={formatMessage(intl, "ledger", "ledger.journals.form.close")}
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </Grid>
      </StyledDialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error">
            {formatMessage(intl, "ledger", "ledger.journals.rejectionTitle")}: {mutationMessage(intl, error)}
          </Alert>
        ) : null}
        <Grid container spacing={2}>
          <Grid size={6} className="item">
            <TextField
              required
              fullWidth
              variant="standard"
              label={formatMessage(intl, "ledger", "ledger.journals.form.name")}
              value={form.name}
              onChange={(event) => setAttribute("name")(event.target.value)}
            />
          </Grid>
          <Grid size={6} className="item">
            <TextField
              required
              fullWidth
              variant="standard"
              label={formatMessage(intl, "ledger", "ledger.journals.form.code")}
              value={form.code}
              onChange={(event) => setAttribute("code")(event.target.value)}
            />
          </Grid>
          <Grid size={6} className="item">
            <JournalTypePicker value={form.journalType} onChange={setAttribute("journalType")} />
          </Grid>
          <Grid size={6} className="item">
            <AccountPicker
              label={formatMessage(intl, "ledger", "ledger.journals.form.defaultDebitAccount")}
              value={form.defaultDebitAccount}
              onChange={setAttribute("defaultDebitAccount")}
            />
          </Grid>
          <Grid size={6} className="item">
            <AccountPicker
              label={formatMessage(intl, "ledger", "ledger.journals.form.defaultCreditAccount")}
              value={form.defaultCreditAccount}
              onChange={setAttribute("defaultCreditAccount")}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting} variant="outlined">
          {formatMessage(intl, "ledger", "ledger.journals.form.cancel")}
        </Button>
        <Button onClick={submit} disabled={!canSave || submitting} variant="contained">
          {formatMessage(intl, "ledger", isEdit ? "ledger.journals.form.save" : "ledger.journals.create.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { JournalFormDialog, EMPTY_JOURNAL };
export default injectIntl(JournalFormDialog);
