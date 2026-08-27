import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import _debounce from "lodash/debounce";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { searchParty } from "../actions";
import { DEFUALT_DEBOUNCE_TIME } from "../constants";

const PartyPicker = ({ intl, value, onChange, results, fetchingResults, searchParty }) => {
  const [inputValue, setInputValue] = useState("");

  const debouncedSearch = useMemo(
    () =>
      _debounce((term) => {
        searchParty(term);
      }, DEFUALT_DEBOUNCE_TIME),
    [searchParty],
  );

  // The backend analyticValue query has no axis filter, so it returns both
  // party and funder values; keep only party-axis rows (partyType is set).
  const partyResults = useMemo(() => (results || []).filter((result) => !!result.partyType), [results]);

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  return (
    <Autocomplete
      options={partyResults || []}
      loading={fetchingResults}
      openOnFocus
      value={value || null}
      inputValue={inputValue}
      onOpen={() => searchParty("")}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
        debouncedSearch(newInputValue);
      }}
      onChange={(_, newValue) => onChange(newValue)}
      filterOptions={(options) => options}
      getOptionLabel={(option) =>
        option?.displayName
          ? `${option.displayName} (${formatMessage(intl, "ledger", `ledger.picker.partyType.${option.partyType}`)})`
          : ""
      }
      isOptionEqualToValue={(option, val) => option?.analyticValueId === val?.analyticValueId}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      renderInput={(params) => (
        <TextField {...params} label={formatMessage(intl, "ledger", "ledger.picker.party")} variant="standard" />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  results: state.ledger.partySearch.results,
  fetchingResults: state.ledger.partySearch.isFetching,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ searchParty }, dispatch);

export { PartyPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(PartyPicker));
