import React, { useEffect, useRef, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { Alert, Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Helmet, coreConfirm, formatMessage, formatMessageWithValues, withModulesManager } from "@openimis/fe-core";
import JournalFormDialog from "../dialogs/JournalFormDialog";
import JournalsSearcher from "../components/JournalsSearcher";
import { hasLedgerAdminRight, hasLedgerReportingRight } from "../utils/permissions";
import { ledgerSearcherStyles } from "../utils/styles";
import { createJournal, deleteJournal, updateJournal } from "../actions";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
  ...ledgerSearcherStyles(theme),
}));

/* Journals (ticket 37990): paginated list plus one shared dialog for creation
   and edition, and row actions (edit/delete) for administrators only. The page
   owns the flows: the searcher stays a presentation component. */
const JournalsPage = ({
  intl,
  rights,
  journalMutation,
  confirmed,
  createJournal: saveJournal,
  updateJournal: saveJournalUpdate,
  deleteJournal: removeJournal,
  coreConfirm: askConfirmation,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [confirmedAction, setConfirmedAction] = useState(null);
  const [searcherKey, setSearcherKey] = useState(0);
  // `core.confirmed` stays true after a confirmation: only the false -> true
  // transition must run the pending action (mirrors the class-based modules).
  const previouslyConfirmedRef = useRef(false);

  const canRead = hasLedgerReportingRight(rights);
  const canManage = hasLedgerAdminRight(rights);
  const submitting = journalMutation?.submitting || false;
  const mutationError = journalMutation?.error || null;

  // Creation, edition and deletion answer with the mutation ids only: on
  // success the dialog closes and the paginated list is refreshed (page 0).
  useEffect(() => {
    if (!journalMutation?.lastMutationAt) return;
    setDialogOpen(false);
    setEditingJournal(null);
    setSearcherKey((key) => key + 1);
  }, [journalMutation?.lastMutationAt]);

  useEffect(() => {
    const wasConfirmed = previouslyConfirmedRef.current;
    previouslyConfirmedRef.current = confirmed;
    if (!confirmed || wasConfirmed || !confirmedAction) return;
    confirmedAction();
    setConfirmedAction(null);
  }, [confirmed, confirmedAction]);

  // Only hook-free rendering happens below: the access check must stay after
  // every hook so the hook order never changes between renders.
  if (!canRead) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const openCreateDialog = () => {
    setEditingJournal(null);
    setDialogOpen(true);
  };

  const openEditDialog = (journal) => {
    setEditingJournal(journal);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingJournal(null);
  };

  const submitForm = (values) => {
    if (editingJournal) {
      saveJournalUpdate({
        journalUuid: editingJournal.id,
        ...values,
        clientMutationLabel: formatMessageWithValues(intl, "ledger", "ledger.journals.edit.mutationLabel", {
          code: values.code,
        }),
      });
      return;
    }
    saveJournal({
      ...values,
      clientMutationLabel: formatMessage(intl, "ledger", "ledger.journals.create.mutationLabel"),
    });
  };

  const askDelete = (journal) => {
    setConfirmedAction(
      () => () =>
        removeJournal({
          journalUuid: journal.id,
          clientMutationLabel: formatMessageWithValues(intl, "ledger", "ledger.journals.delete.mutationLabel", {
            code: journal.code,
          }),
        }),
    );
    askConfirmation(
      formatMessageWithValues(intl, "ledger", "ledger.journals.delete.confirmTitle", { code: journal.code }),
      formatMessage(intl, "ledger", "ledger.journals.delete.confirmMessage"),
    );
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.journals.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <JournalsSearcher
              key={searcherKey}
              canManage={canManage}
              onCreate={openCreateDialog}
              onEdit={openEditDialog}
              onDelete={askDelete}
            />
          </Grid>
        </Grid>
        <JournalFormDialog
          open={dialogOpen}
          journal={editingJournal}
          submitting={submitting}
          error={mutationError}
          onClose={closeDialog}
          onSubmit={submitForm}
        />
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  confirmed: state.core?.confirmed,
  journalMutation: state.ledger?.journalMutation,
});

const mapDispatchToProps = {
  createJournal,
  updateJournal,
  deleteJournal,
  coreConfirm,
};

export { JournalsPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(JournalsPage)));
