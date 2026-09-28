import React from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { injectIntl } from "react-intl";
import { formatMessage } from "@openimis/fe-core";

const ForwardOnlyModeWarningDialog = ({ intl, open, onCancel, onConfirm, submitting = false }) => (
  <Dialog open={open} onClose={submitting ? undefined : onCancel} aria-labelledby="ledger-forward-only-warning-title">
    <DialogTitle id="ledger-forward-only-warning-title">
      {formatMessage(intl, "ledger", "ledger.deployment.forwardOnly.title")}
    </DialogTitle>
    <DialogContent>
      <Alert severity="warning">
        {formatMessage(intl, "ledger", "ledger.deployment.forwardOnly.message")}
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={submitting}>
        {formatMessage(intl, "ledger", "ledger.deployment.forwardOnly.cancel")}
      </Button>
      <Button onClick={onConfirm} disabled={submitting} variant="contained" autoFocus>
        {formatMessage(intl, "ledger", "ledger.deployment.forwardOnly.confirm")}
      </Button>
    </DialogActions>
  </Dialog>
);

export { ForwardOnlyModeWarningDialog };
export default injectIntl(ForwardOnlyModeWarningDialog);
