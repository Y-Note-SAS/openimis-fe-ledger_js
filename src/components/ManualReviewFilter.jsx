import React from "react";
import { injectIntl } from "react-intl";
import { Grid, MenuItem, Select } from "@mui/material";
import { styled } from "@mui/material/styles";
import { GRID_RESPONSIVE_STANDARD, formatMessage, withModulesManager } from "@openimis/fe-core";
import { MANUAL_REVIEW_STATUS } from "../constants";

const StyledManualReviewFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": { padding: theme.spacing(1) },
}));

// FilterPane for the review queue Searcher: the status is a backend enum value
// applied server-side (`replicationRecord_Status`).
const ManualReviewFilter = ({ intl, filters, onChangeFilters }) => (
  <StyledManualReviewFilter>
    <Grid container>
      <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
        <Select
          size="small"
          fullWidth
          displayEmpty
          value={filters?.status?.value ?? ""}
          onChange={(event) => onChangeFilters([{ id: "status", value: event.target.value || null, filter: null }])}
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
  </StyledManualReviewFilter>
);

export { ManualReviewFilter };
export default withModulesManager(injectIntl(ManualReviewFilter));
