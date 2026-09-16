import React, { useEffect, useRef, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Alert, Button, Grid, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Helmet,
  Searcher,
  formatMessage,
  formatMessageWithValues,
  journalize,
  withModulesManager,
} from "@openimis/fe-core";
import { DEFAULT_PAGE_SIZE, MANUAL_REVIEW_STATUS, ROWS_PER_PAGE_OPTIONS } from "../constants";
import { hasLedgerAdminRight } from "../utils/permissions";
import {
  fetchAccountingPeriods,
  fetchLedgerEntries,
  fetchManualReviewQueue,
  resolveManualReviewItem,
} from "../actions";
import ManualReviewFilter from "../components/ManualReviewFilter";
import ManualReviewResolutionDialog from "../components/ManualReviewResolutionDialog";

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

/**
 * User Story 5 — replication review queue. `manualReviewQueue` is a paginated
 * connection; pagination and the (server-side) status filter are handled by the
 * shared fe-core `Searcher`.
 */
const ManualReviewQueuePage = ({
  intl,
  rights,
  manualReviewQueue,
  ledgerEntries,
  accountingPeriods,
  reviewResolution,
  mutation,
  submittingMutation,
  journalize,
  fetchManualReviewQueue,
  fetchLedgerEntries,
  fetchAccountingPeriods,
  resolveManualReviewItem,
}) => {
  const fetchContextRef = useRef({ pageInfo: {} });
  const [selectedItemId, setSelectedItemId] = useState(null);
  const isAdmin = hasLedgerAdminRight(rights);

  // Hand the completed resolution mutation to the JournalDrawer.
  const prevSubmittingMutationRef = useRef();
  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });
  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittingMutation]);

  useEffect(() => {
    if (isAdmin) {
      fetchAccountingPeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetch = () => {
    const { status, pageInfo } = fetchContextRef.current;
    return fetchManualReviewQueue({ first: pageInfo.first, after: pageInfo.after, status: status ?? null });
  };

  const filtersToQueryParams = (state) => {
    fetchContextRef.current = {
      status: state.filters?.status?.value ?? null,
      pageInfo: { first: state.pageSize, after: state.afterCursor, before: state.beforeCursor },
    };
    const params = [];
    if (!state.beforeCursor && !state.afterCursor) {
      params.push(`first: ${state.pageSize}`);
    }
    if (state.afterCursor) {
      params.push(`after: "${state.afterCursor}"`);
      params.push(`first: ${state.pageSize}`);
    }
    if (state.beforeCursor) {
      params.push(`before: "${state.beforeCursor}"`);
      params.push(`last: ${state.pageSize}`);
    }
    return params;
  };

  if (!isAdmin) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  const items = manualReviewQueue?.items || [];
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  const openResolution = (item) => {
    setSelectedItemId(item.id);
    fetchLedgerEntries([
      `accountingPeriod: "${item.originalEntry?.accountingPeriodId}"`,
      `party: "${item.originalEntry?.partyAnalyticValueId}"`,
      "first: 100",
    ]);
  };

  const headers = () => [
    "ledger.reviewQueue.table.status",
    "ledger.reviewQueue.table.originalEntry",
    "ledger.reviewQueue.table.reason",
    "ledger.reviewQueue.table.targetSystem",
    "ledger.reviewQueue.table.actions",
  ];

  const itemFormatters = () => [
    (item) => formatMessage(intl, "ledger", `ledger.reviewQueue.status.${String(item.status || "").toLowerCase()}`),
    (item) => (
      <Typography variant="body2">
        {item.originalEntry?.sourceEventReference || item.originalEntry?.id || "—"}
        {item.originalEntry?.journal?.code ? ` · ${item.originalEntry.journal.code}` : ""}
      </Typography>
    ),
    (item) => item.rejectionReason || "—",
    (item) => item.targetSystem || "—",
    (item) => (
      <Button size="small" variant="outlined" onClick={() => openResolution(item)}>
        {formatMessage(
          intl,
          "ledger",
          item.status === MANUAL_REVIEW_STATUS.PENDING
            ? "ledger.reviewQueue.action.resolve"
            : "ledger.reviewQueue.action.view",
        )}
      </Button>
    ),
  ];

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.reviewQueue.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <Searcher
              module="ledger"
              cacheFiltersKey="ledgerReviewQueueFiltersCache"
              FilterPane={ManualReviewFilter}
              items={items}
              itemsPageInfo={manualReviewQueue?.pageInfo}
              fetchingItems={manualReviewQueue?.isFetching}
              fetchedItems={manualReviewQueue?.isFetched}
              errorItems={manualReviewQueue?.error}
              tableTitle={formatMessageWithValues(intl, "ledger", "ledger.reviewQueue.pageTitle")}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              defaultFilters={() => ({})}
              fetch={fetch}
              rowIdentifier={(item) => item.id}
              filtersToQueryParams={filtersToQueryParams}
              headers={headers}
              itemFormatters={itemFormatters}
            />
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
  mutation: state.ledger.mutation,
  submittingMutation: state.ledger.submittingMutation,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    { fetchManualReviewQueue, fetchLedgerEntries, fetchAccountingPeriods, resolveManualReviewItem, journalize },
    dispatch,
  );

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(ManualReviewQueuePage)));
