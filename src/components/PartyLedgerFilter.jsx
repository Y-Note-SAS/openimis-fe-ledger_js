import React from "react";
import { injectIntl } from "react-intl";
import { Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import { GRID_RESPONSIVE_STANDARD, withModulesManager } from "@openimis/fe-core";
import PartyPicker from "../pickers/PartyPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";

const StyledPartyLedgerFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": { padding: theme.spacing(1) },
}));

// FilterPane for the Party Sub-Ledger Searcher: the values are read back by the
// page's `filtersToQueryParams` to build the backend arguments (exact
// `analyticValue_DisplayName` + `accountingPeriod_Code`), so no raw filter
// string is attached here.
const PartyLedgerFilter = ({ filters, onChangeFilters }) => {
  const setFilter = (id, value) => onChangeFilters([{ id, value, filter: null }]);

  return (
    <StyledPartyLedgerFilter>
      <Grid container>
        <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
          <PartyPicker value={filters?.party?.value ?? null} onChange={(value) => setFilter("party", value)} />
        </Grid>
        <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
          <AccountingPeriodPicker
            value={filters?.accountingPeriod?.value ?? null}
            onChange={(value) => setFilter("accountingPeriod", value)}
            withNull
          />
        </Grid>
      </Grid>
    </StyledPartyLedgerFilter>
  );
};

export { PartyLedgerFilter };
export default withModulesManager(injectIntl(PartyLedgerFilter));
