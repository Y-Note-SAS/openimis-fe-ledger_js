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
import { Helmet, withModulesManager, formatMessage, formatMessageWithValues } from "@openimis/fe-core";
import { hasLedgerAdminRight } from "../utils/permissions";
import { DEFAULT_PAGE_SIZE, MANUAL_REVIEW_STATUS } from "../constants";
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
  const [afterCursor, setAfterCursor] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const isAdmin = hasLedgerAdminRight(rights);

  // A filter change restarts the pagination from the first page.
  useEffect(() => {
    setAfterCursor(null);
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchManualReviewQueue({ first: DEFAULT_PAGE_SIZE, after: afterCursor, status: statusFilter || null });
      fetchAccountingPeriods();
    }
  }, [fetchAccountingPeriods, fetchManualReviewQueue, isAdmin, statusFilter, afterCursor]);

  if (!isAdmin) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const items = manualReviewQueue?.items || [];
  const pageInfo = manualReviewQueue?.pageInfo || {};
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
                    {Object.values(MANUAL_REVIEW_STATUS).map((status) => (
                      <MenuItem key={status} value={status}>
                        {formatMessage(intl, "ledger", `ledger.reviewQueue.status.${status.toLowerCase()}`)}
                      </MenuItem>
                    ))}
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
                {items.length === 0 ? (
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
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatMessage(intl, "ledger", `ledger.reviewQueue.status.${String(item.status || "").toLowerCase()}`)}</TableCell>
                          <TableCell>
                            {item.originalEntry?.sourceEventReference || item.originalEntry?.id || "—"}
                            {item.originalEntry?.journal?.code ? ` · ${item.originalEntry.journal.code}` : ""}
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
                <Grid container justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Grid>
                    <Typography variant="caption" color="text.secondary">
                      {formatMessageWithValues(intl, "ledger", "ledger.pagination.total", {
                        count: pageInfo.totalCount ?? 0,
                      })}
                    </Typography>
                  </Grid>
                  <Grid>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!afterCursor}
                      onClick={() => setAfterCursor(null)}
                      sx={{ mr: 1 }}
                    >
                      {formatMessage(intl, "ledger", "ledger.pagination.first")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!pageInfo.hasNextPage}
                      onClick={() => setAfterCursor(pageInfo.endCursor)}
                    >
                      {formatMessage(intl, "ledger", "ledger.pagination.next")}
                    </Button>
                  </Grid>
                </Grid>
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
