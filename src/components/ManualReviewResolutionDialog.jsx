import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { MANUAL_REVIEW_STATUS } from "../constants";
import { filterCorrectingEntryCandidates } from "../utils/correctingEntryCandidates";
import { getManualReviewOriginalEntryDisplay } from "../utils/manualReviewDisplay";

const ManualReviewResolutionDialog = ({
  intl,
  item,
  ledgerEntries,
  accountingPeriods,
  open,
  submitting = false,
  error = null,
  onClose,
  onResolve,
}) => {
  const [correctingEntryId, setCorrectingEntryId] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    setCorrectingEntryId("");
    setResolutionNote("");
  }, [item?.id]);

  const candidates = useMemo(
    () => filterCorrectingEntryCandidates(ledgerEntries, item?.originalEntry),
    [ledgerEntries, item?.originalEntry],
  );
  const originalEntryDisplay = useMemo(
    () => (item ? getManualReviewOriginalEntryDisplay(item, ledgerEntries, accountingPeriods) : null),
    [item, ledgerEntries, accountingPeriods],
  );
  const isPending = item?.status === MANUAL_REVIEW_STATUS.PENDING;
  const canResolve = isPending && correctingEntryId && resolutionNote.trim() && !submitting;

  if (!item) return null;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.title")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2">
          {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.originalEntry")}
        </Typography>
        <Box
          sx={{
            mt: 1,
            mb: 2,
          }}
        >
          {[
            ["ledger.reviewQueue.dialog.entry", originalEntryDisplay.reference],
            ["ledger.reviewQueue.dialog.period", originalEntryDisplay.period],
            ["ledger.reviewQueue.dialog.party", originalEntryDisplay.party],
            ["ledger.reviewQueue.dialog.journal", originalEntryDisplay.journal],
            ["ledger.reviewQueue.dialog.postedAt", originalEntryDisplay.postedAt],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(130px, 35%) 1fr",
                gap: 2,
                alignItems: "center",
                py: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {formatMessage(intl, "ledger", label)}
              </Typography>
              <Typography variant="body2">{value}</Typography>
            </Box>
          ))}
        </Box>

        <Alert severity="warning" sx={{ mb: 2 }}>
          {item.rejectionReason}
        </Alert>

        {item.status === MANUAL_REVIEW_STATUS.RESOLVED ? (
          <>
            <Typography variant="body2">
              {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.resolvedEntry")}: {item.correctingEntryId || "—"}
            </Typography>
            <Typography variant="body2">
              {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.resolutionNote")}: {item.resolutionNote || "—"}
            </Typography>
          </>
        ) : (
          <>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="manual-review-correcting-entry-label">
                {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.correctingEntry")}
              </InputLabel>
              <Select
                labelId="manual-review-correcting-entry-label"
                value={correctingEntryId}
                label={formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.correctingEntry")}
                onChange={(event) => setCorrectingEntryId(event.target.value)}
              >
                {candidates.map((entry) => (
                  <MenuItem key={entry.id} value={entry.id}>
                    {entry.id} — {entry.journal?.code || entry.journal?.name || "—"} — {entry.postedAt || "—"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {candidates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.noCandidates")}
              </Typography>
            ) : null}
            <TextField
              fullWidth
              required
              multiline
              minRows={3}
              margin="normal"
              label={formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.resolutionNote")}
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
            />
          </>
        )}
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.close")}
        </Button>
        {isPending ? (
          <Button
            variant="contained"
            disabled={!canResolve}
            onClick={() => onResolve(item.id, correctingEntryId, resolutionNote.trim())}
          >
            {formatMessage(intl, "ledger", "ledger.reviewQueue.dialog.resolve")}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export { ManualReviewResolutionDialog };
export default injectIntl(ManualReviewResolutionDialog);
