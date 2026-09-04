import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { fetchJournals } from "../actions";

/* Journal picker backed by the `journals` reference query (object { name, code, type }).
   Accepts a journal object or a journal code as `value`; `onChange` yields the journal object (or null).
   The optional `type` prop restricts the fetched list to journals of that type (e.g. "TRESORERIE"). */
const optionLabel = (option) => (option?.name ? (option?.type ? `${option.name} (${option.type})` : option.name) : "");

const LedgerJournalPicker = ({
  intl,
  value,
  label,
  type,
  onChange,
  results,
  isFetching,
  fetchedType,
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

  // controlled_input_sync (review): keep the text shown in the field in sync
  // with the selection when the parent programmatically resets/replaces `value`
  // (e.g. a filter reset), instead of leaving a stale `inputValue`.
  useEffect(() => {
    setInputValue(resolvedValue ? optionLabel(resolvedValue) : "");
  }, [resolvedValue]);

  // Client-side filtering on name/code: the `journals` query does not support a
  // text search, so typing must filter the fetched list locally.
  const filteredOptions = useMemo(() => {
    const options = results || [];
    const needle = inputValue.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        String(option?.name || "")
          .toLowerCase()
          .includes(needle) ||
        String(option?.code || "")
          .toLowerCase()
          .includes(needle),
    );
  }, [results, inputValue]);

  const resolvedType = type || null;
  const needsFetch = !(results || []).length || fetchedType !== resolvedType;

  return (
    <Autocomplete
      options={filteredOptions}
      loading={isFetching}
      openOnFocus
      value={resolvedValue}
      inputValue={inputValue}
      onOpen={() => needsFetch && fetchJournals(resolvedType)}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange(newValue || null)}
      filterOptions={(options) => options}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(option, val) => (option?.id ?? option?.code) === (val?.id ?? val?.code)}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      disabled={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          disabled={readOnly}
          label={label || formatMessage(intl, "ledger", "ledger.picker.journal")}
          variant="standard"
        />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  results: state.ledger?.journalSearch?.results,
  isFetching: state.ledger?.journalSearch?.isFetching,
  fetchedType: state.ledger?.journalSearch?.fetchedType,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchJournals }, dispatch);

export { LedgerJournalPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(LedgerJournalPicker));
