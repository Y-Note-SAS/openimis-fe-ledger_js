import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { fetchJournalTypes } from "../actions";

/* Journal type picker backed by the `journalTypes` query (JournalTypes:
   code/type/altLanguage). The backend stores the journal type as a FK, so the
   picker value is the whole node (its decoded uuid is what createJournal takes
   as `type`). The displayed label is translated frontend-side from
   `ledger.journalType.<code>` and falls back to the backend altLanguage/type
   when no key exists yet. */
const journalTypeLabel = (intl, node) => {
  if (!node) return "";
  const key = `ledger.journalType.${node.code}`;
  if (node.code && intl.messages?.[key]) {
    return intl.formatMessage({ id: key });
  }
  return node.altLanguage || node.type || node.code || "";
};

const JournalTypePicker = ({
  intl,
  value,
  label,
  onChange,
  results,
  isFetching,
  fetchedTypes,
  fetchJournalTypes: loadJournalTypes,
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  const resolvedValue = useMemo(() => {
    if (!value) return null;
    if (typeof value === "object") return value;
    return (results || []).find((node) => node.id === value || node.code === value) || null;
  }, [value, results]);

  useEffect(() => {
    setInputValue(resolvedValue ? journalTypeLabel(intl, resolvedValue) : "");
  }, [resolvedValue, intl]);

  useEffect(() => {
    if (!fetchedTypes && !isFetching) loadJournalTypes();
  }, [fetchedTypes, isFetching, loadJournalTypes]);

  return (
    <Autocomplete
      options={results || []}
      loading={isFetching}
      openOnFocus
      value={resolvedValue}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange(newValue || null)}
      getOptionLabel={(option) => journalTypeLabel(intl, option)}
      isOptionEqualToValue={(option, val) => option?.id === val?.id || option?.code === val?.code}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      disabled={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          disabled={readOnly}
          label={label || formatMessage(intl, "ledger", "ledger.picker.journalType")}
          variant="standard"
        />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  results: state.ledger?.journalTypes?.items,
  isFetching: state.ledger?.journalTypes?.isFetching,
  fetchedTypes: state.ledger?.journalTypes?.isFetched,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchJournalTypes }, dispatch);

export { journalTypeLabel };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(JournalTypePicker));
