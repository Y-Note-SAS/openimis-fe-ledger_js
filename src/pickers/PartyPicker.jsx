import React, { useState } from "react";
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

  const debouncedSearch = _debounce((term) => {
    if (term && term.length > 1) {
      searchParty(term);
    }
  }, DEFUALT_DEBOUNCE_TIME);

  return (
    <Autocomplete
      options={results || []}
      loading={fetchingResults}
      value={value || null}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
        debouncedSearch(newInputValue);
      }}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(option) => (option?.displayName ? `${option.displayName} (${option.partyType})` : "")}
      isOptionEqualToValue={(option, val) => option?.analyticValueId === val?.analyticValueId}
      renderInput={(params) => (
        <TextField {...params} label={formatMessage(intl, "ledger", "ledger.party")} variant="standard" />
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
