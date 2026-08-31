import React, { useEffect, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";
import { hasLedgerAdminRight } from "../utils/permissions";
import { MANUAL_REVIEW_STATUS } from "../constants";
import {
  fetchLedgerEntries,
  fetchAccountingPeriods,
  fetchManualReviewQueue,
  resolveManualReviewItem,
} from "../actions";
import ManualReviewResolutionDialog from "../components/ManualReviewResolutionDialog";

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

const ManualReviewQueuePage = ({
  intl,
  rights,
  manualReviewQueue,
  ledgerEntries,
  accountingPeriods,
  reviewResolution,
  fetchManualReviewQueue,
  fetchLedgerEntries,
  fetchAccountingPeriods,
  resolveManualReviewItem,
}) => {
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const isAdmin = hasLedgerAdminRight(rights);

  useEffect(() => {
    if (isAdmin) {
      fetchManualReviewQueue(statusFilter || null);
      fetchAccountingPeriods();
    }
  }, [fetchAccountingPeriods, fetchManualReviewQueue, isAdmin, statusFilter]);

  if (!isAdmin) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const items = manualReviewQueue?.items || [];
  const visibleItems = statusFilter ? items.filter((item) => item.status === statusFilter) : items;
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  const openResolution = (item) => {
    setSelectedItemId(item.id);
    fetchLedgerEntries([
      `accountingPeriod: "${item.originalEntry?.accountingPeriodId}"`,
      `party: "${item.originalEntry?.partyAnalyticValueId}"`,
      "first: 100",
    ]);
  };

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.reviewQueue.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.reviewQueue.pageTitle")}</Typography>
                </Grid>
                <Grid>
                  <Select
                    size="small"
                    value={statusFilter}
                    displayEmpty
                    onChange={(event) => setStatusFilter(event.target.value)}
                    inputProps={{ "aria-label": formatMessage(intl, "ledger", "ledger.reviewQueue.filter.status") }}
                  >
                    <MenuItem value="">{formatMessage(intl, "ledger", "ledger.reviewQueue.filter.all")}</MenuItem>
                    <MenuItem value={MANUAL_REVIEW_STATUS.PENDING}>{formatMessage(intl, "ledger", "ledger.reviewQueue.status.pending")}</MenuItem>
                    <MenuItem value={MANUAL_REVIEW_STATUS.RESOLVED}>{formatMessage(intl, "ledger", "ledger.reviewQueue.status.resolved")}</MenuItem>
                  </Select>
                </Grid>
              </Grid>
              <Divider />
              {manualReviewQueue?.error ? (
                <Box className="paperBody">
                  <Alert severity="error">{manualReviewQueue.error.message || manualReviewQueue.error}</Alert>
                </Box>
              ) : null}
              <Box className="paperBody" sx={{ overflowX: "auto" }}>
                {visibleItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {formatMessage(intl, "ledger", "ledger.reviewQueue.empty")}
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.reviewQueue.table.status")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.reviewQueue.table.originalEntry")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.reviewQueue.table.reason")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.reviewQueue.table.targetSystem")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.reviewQueue.table.actions")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatMessage(intl, "ledger", `ledger.reviewQueue.status.${item.status}`)}</TableCell>
                          <TableCell>
                            {item.originalEntry?.sourceEventReference || item.originalEntry?.id || "—"}
                            {item.originalEntry?.journalCode ? ` · ${item.originalEntry.journalCode}` : ""}
                          </TableCell>
                          <TableCell>{item.rejectionReason || item.flagReason || "—"}</TableCell>
                          <TableCell>{item.targetSystem || "—"}</TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" onClick={() => openResolution(item)}>
                              {formatMessage(
                                intl,
                                "ledger",
                                item.status === MANUAL_REVIEW_STATUS.PENDING
                                  ? "ledger.reviewQueue.action.resolve"
                                  : "ledger.reviewQueue.action.view",
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </StyledPaper>
          </Grid>
        </Grid>
        <ManualReviewResolutionDialog
          item={selectedItem}
          ledgerEntries={ledgerEntries?.items || []}
          accountingPeriods={accountingPeriods?.items || []}
          open={!!selectedItem}
          submitting={reviewResolution?.submitting}
          error={reviewResolution?.error}
          onClose={() => setSelectedItemId(null)}
          onResolve={(itemId, correctingEntryId, resolutionNote) =>
            resolveManualReviewItem(itemId, correctingEntryId, resolutionNote)
          }
        />
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  manualReviewQueue: state.ledger.manualReviewQueue,
  ledgerEntries: state.ledger.ledgerEntries,
  accountingPeriods: state.ledger.accountingPeriods,
  reviewResolution: state.ledger.reviewResolution,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    { fetchManualReviewQueue, fetchLedgerEntries, fetchAccountingPeriods, resolveManualReviewItem },
    dispatch,
  );

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(ManualReviewQueuePage)));
