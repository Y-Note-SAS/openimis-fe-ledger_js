import React from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { injectIntl } from "react-intl";
import { formatMessage } from "@openimis/fe-core";
import { EXPORT_JOB_STATUS } from "../constants";

const ExportJobStatus = ({ intl, job, status, provisional, downloadUrl, failureMessage }) => {
  const exportJob = job || { status, provisional, downloadUrl, failureMessage };
  if (!job && !status) return null;

  const currentStatus = exportJob.status;
  const statusLabel = formatMessage(intl, "ledger", `ledger.export.status.${currentStatus}`);
  const isFinal = exportJob.provisional === false;
  const numberingLabel = formatMessage(
    intl,
    "ledger",
    `ledger.export.numbering.${isFinal ? "final" : "provisional"}`,
  );

  return (
    <Stack spacing={1} role="status" aria-live="polite">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography component="span">
          {formatMessage(intl, "ledger", "ledger.export.statusLabel")}: {statusLabel}
        </Typography>
        {currentStatus === EXPORT_JOB_STATUS.COMPLETE || currentStatus === EXPORT_JOB_STATUS.IN_PROGRESS ? (
          <Chip
            size="small"
            color={isFinal ? "success" : "warning"}
            label={numberingLabel}
          />
        ) : null}
      </Stack>

      {currentStatus === EXPORT_JOB_STATUS.FAILED ? (
        <Alert severity="error">
          {exportJob.failureMessage || formatMessage(intl, "ledger", "ledger.export.failure")}
        </Alert>
      ) : null}

      {currentStatus === EXPORT_JOB_STATUS.COMPLETE && exportJob.downloadUrl ? (
        <Button component="a" href={exportJob.downloadUrl} download variant="contained" size="small">
          {formatMessage(intl, "ledger", "ledger.export.download")}
        </Button>
      ) : null}
    </Stack>
  );
};

export { ExportJobStatus };
export default injectIntl(ExportJobStatus);
