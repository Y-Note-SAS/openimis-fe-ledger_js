import React, { useEffect, useMemo, useRef, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { Alert, Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Helmet,
  coreConfirm,
  formatMessage,
  formatMessageWithValues,
  journalize,
  withModulesManager,
} from "@openimis/fe-core";
import AccountFormDialog from "../dialogs/AccountFormDialog";
import AccountsSearcher from "../components/AccountsSearcher";
import { DEFAULT_CURRENCY_CODE } from "../constants";
import { collectCurrencyCodes } from "../utils/currencies";
import { hasLedgerAdminRight, hasLedgerReportingRight } from "../utils/permissions";
import { ledgerSearcherStyles } from "../utils/styles";
import {
  createAccount,
  deleteAccount,
  fetchAccountOptions,
  fetchLedgerDeploymentConfiguration,
  updateAccount,
} from "../actions";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
  ...ledgerSearcherStyles(theme),
}));

/* Chart of accounts (ticket 37991): paginated list plus one shared dialog for
   creation and edition, and row actions (edit/delete) for administrators only.
   The page owns the flows: the searcher stays a presentation component. */
const AccountsPage = ({
  intl,
  rights,
  accountMutation,
  mutation,
  submittingMutation,
  accountOptions,
  deploymentConfiguration,
  confirmed,
  createAccount: saveAccount,
  updateAccount: saveAccountUpdate,
  deleteAccount: removeAccount,
  coreConfirm: askConfirmation,
  journalize: logMutation,
  fetchAccountOptions: loadAccountOptions,
  fetchLedgerDeploymentConfiguration: loadDeploymentConfiguration,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [confirmedAction, setConfirmedAction] = useState(null);
  const [searcherKey, setSearcherKey] = useState(0);
  // `core.confirmed` stays true after a confirmation: only the false -> true
  // transition must run the pending action (mirrors the class-based modules).
  const previouslyConfirmedRef = useRef(false);

  const canRead = hasLedgerReportingRight(rights);
  const canManage = hasLedgerAdminRight(rights);
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

  // Creation, edition and deletion answer with the mutation ids only: on
  // success the dialog closes and the paginated list is refreshed (page 0).
  useEffect(() => {
    if (!accountMutation?.lastMutationAt) return;
    setDialogOpen(false);
    setEditingAccount(null);
    setSearcherKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountMutation?.lastMutationAt]);

  // Once a mutation completes, hand it to the JournalDrawer (right panel) —
  // standard openIMIS mutation journaling. The previous value must be compared
  // *before* being stored, otherwise the transition is missed.
  const prevSubmittingMutationRef = useRef(false);
  useEffect(() => {
    const wasSubmitting = prevSubmittingMutationRef.current;
    prevSubmittingMutationRef.current = submittingMutation;
    if (wasSubmitting && !submittingMutation) {
      logMutation(mutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittingMutation]);

  useEffect(() => {
    const wasConfirmed = previouslyConfirmedRef.current;
    previouslyConfirmedRef.current = confirmed;
    if (!confirmed || wasConfirmed || !confirmedAction) return;
    confirmedAction();
    setConfirmedAction(null);
  }, [confirmed, confirmedAction]);

  // The instance currency (deployment configuration, XAF by default) is the
  // default value; the codes already used by the chart of accounts are offered
  // as suggestions and any other ISO code can be typed in.
  const currencyOptions = useMemo(
    () => Array.from(new Set([configuredCurrency, ...collectCurrencyCodes(accountOptions?.items)].filter(Boolean))),
    [configuredCurrency, accountOptions?.items],
  );

  if (!canRead) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const openCreateDialog = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const submitForm = (values) => {
    // `parent` is the picked account node (creation) or the current parent shown
    // read-only (edition); the mutation only takes its uuid.
    const { parent, ...attributes } = values;
    const parentId = parent?.uuid ?? null;
    if (editingAccount) {
      saveAccountUpdate({
        accountUuid: editingAccount.uuid,
        ...attributes,
        parentId,
        clientMutationLabel: formatMessageWithValues(intl, "ledger", "ledger.accounts.edit.mutationLabel", {
          code: values.code,
        }),
      });
      return;
    }
    saveAccount({
      ...attributes,
      parentId,
      clientMutationLabel: formatMessage(intl, "ledger", "ledger.accounts.create.mutationLabel"),
    });
  };

  const askDelete = (account) => {
    // Safety net: the row action is already disabled for parent accounts.
    if ((account?.children?.totalCount ?? 0) > 0) return;
    setConfirmedAction(
      () => () =>
        removeAccount({
          accountUuid: account.uuid,
          clientMutationLabel: formatMessageWithValues(intl, "ledger", "ledger.accounts.delete.mutationLabel", {
            code: account.code,
          }),
        }),
    );
    askConfirmation(
      formatMessageWithValues(intl, "ledger", "ledger.accounts.delete.confirmTitle", { code: account.code }),
      formatMessage(intl, "ledger", "ledger.accounts.delete.confirmMessage"),
    );
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.accounts.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <AccountsSearcher
              key={searcherKey}
              canManage={canManage}
              onCreate={openCreateDialog}
              onEdit={openEditDialog}
              onDelete={askDelete}
            />
          </Grid>
        </Grid>
        <AccountFormDialog
          open={dialogOpen}
          account={editingAccount}
          currencyOptions={currencyOptions}
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
  mutation: state.ledger?.mutation,
  submittingMutation: state.ledger?.submittingMutation,
  accountMutation: state.ledger?.accountMutation,
  accountOptions: state.ledger?.accountOptions,
  deploymentConfiguration: state.ledger?.deploymentConfiguration,
});

const mapDispatchToProps = {
  createAccount,
  updateAccount,
  deleteAccount,
  coreConfirm,
  journalize,
  fetchAccountOptions,
  fetchLedgerDeploymentConfiguration,
};

export { AccountsPage };
export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountsPage)));
