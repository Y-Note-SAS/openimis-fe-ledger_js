import React, { useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import _debounce from "lodash/debounce";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { searchFunder } from "../actions";
import { DEFUALT_DEBOUNCE_TIME } from "../constants";

const FunderPicker = ({ intl, value, onChange, results, fetchingResults, searchFunder }) => {
  const [inputValue, setInputValue] = useState("");

  const debouncedSearch = _debounce((term) => {
    if (term && term.length > 1) {
      searchFunder(term);
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
      getOptionLabel={(option) => option?.displayName || ""}
      isOptionEqualToValue={(option, val) => option?.analyticValueId === val?.analyticValueId}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      renderInput={(params) => (
        <TextField {...params} label={formatMessage(intl, "ledger", "ledger.picker.funder")} variant="standard" />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  results: state.ledger.funderSearch.results,
  fetchingResults: state.ledger.funderSearch.isFetching,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ searchFunder }, dispatch);

export { FunderPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(FunderPicker));
