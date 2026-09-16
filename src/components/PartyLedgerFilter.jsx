import React from "react";
import { injectIntl } from "react-intl";
import { Grid } from "@mui/material";
import { GRID_RESPONSIVE_STANDARD, withModulesManager } from "@openimis/fe-core";
import PartyPicker from "../pickers/PartyPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";

// FilterPane for the Party Sub-Ledger Searcher: the values are read back by the
// page's `filtersToQueryParams` to build the backend arguments (exact
// `analyticValue_DisplayName` + `accountingPeriod_Code`), so no raw filter
// string is attached here.
const PartyLedgerFilter = ({ filters, onChangeFilters }) => {
  const setFilter = (id, value) => onChangeFilters([{ id, value, filter: null }]);

  return (
    <Grid container className="form">
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
  );
};

export { PartyLedgerFilter };
export default withModulesManager(injectIntl(PartyLedgerFilter));
