import React, { useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { fetchJournals } from "../actions";

/* Journal picker backed by the `journals` reference query (object { name, code, type }).
   Accepts a journal object or a journal code as `value`; `onChange` yields the journal object (or null). */
const LedgerJournalPicker = ({
  intl,
  value,
  label,
  onChange,
  results,
  isFetching,
  fetchJournals,
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  const resolvedValue = useMemo(() => {
    if (!value) return null;
    if (typeof value === "object") return value;
    // Backward-compat: value is a journal code string.
    const found = (results || []).find((journal) => journal.code === value);
    return found || { id: value, code: value, name: value };
  }, [value, results]);

  return (
    <Autocomplete
      options={results || []}
      loading={isFetching}
      openOnFocus
      value={resolvedValue}
      inputValue={inputValue}
      onOpen={() => (!results || !results.length) && fetchJournals()}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange(newValue || null)}
      filterOptions={(options) => options}
      getOptionLabel={(option) => (option?.name ? (option?.type ? `${option.name} (${option.type})` : option.name) : "")}
      isOptionEqualToValue={(option, val) => (option?.id ?? option?.code) === (val?.id ?? val?.code)}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      disabled={readOnly}
      renderInput={(params) => (
        <TextField {...params} label={label || formatMessage(intl, "ledger", "ledger.picker.journal")} variant="standard" />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  results: state.ledger?.journalSearch?.results,
  isFetching: state.ledger?.journalSearch?.isFetching,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchJournals }, dispatch);

export { LedgerJournalPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(LedgerJournalPicker));
