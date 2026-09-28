import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { fetchAccountOptions } from "../actions";

/* Chart-of-accounts picker backed by the `accounts` query. `value` may be an
   account node (or a uuid/code resolved against the loaded options) and
   `onChange` yields the account node (or null), so callers can read `uuid` for
   mutations and `code`/`name` for display. `excludeTypes` hides account types
   the backend refuses for the target field (e.g. income/expense accounts cannot
   be used as retained earnings account). */
const optionLabel = (option) => (option?.code ? `${option.code} — ${option.name}` : option?.name || "");

const AccountPicker = ({
  intl,
  value,
  label,
  onChange,
  options,
  isFetching,
  fetchedOptions,
  error = null,
  fetchAccountOptions: loadOptions,
  excludeTypes = [],
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  const resolvedValue = useMemo(() => {
    if (!value) return null;
    if (typeof value === "object") return value;
    return (options || []).find((account) => account.uuid === value || account.code === value) || null;
  }, [value, options]);

  useEffect(() => {
    setInputValue(resolvedValue ? optionLabel(resolvedValue) : "");
  }, [resolvedValue]);

  useEffect(() => {
    // `error` matters: without it a failed request would flip `isFetching` back
    // to false and re-trigger this effect forever.
    if (!fetchedOptions && !isFetching && !error) loadOptions();
  }, [fetchedOptions, isFetching, error, loadOptions]);

  const selectableOptions = useMemo(
    () => (options || []).filter((account) => !excludeTypes.includes(account?.type)),
    [options, excludeTypes],
  );

  const filteredOptions = useMemo(() => {
    const needle = inputValue.trim().toLowerCase();
    if (!needle || needle === optionLabel(resolvedValue).toLowerCase()) return selectableOptions;
    return selectableOptions.filter(
      (option) =>
        String(option?.code || "")
          .toLowerCase()
          .includes(needle) ||
        String(option?.name || "")
          .toLowerCase()
          .includes(needle),
    );
  }, [selectableOptions, inputValue, resolvedValue]);

  return (
    <Autocomplete
      options={filteredOptions}
      loading={isFetching}
      openOnFocus
      value={resolvedValue}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange(newValue || null)}
      filterOptions={(opts) => opts}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(option, val) => (option?.uuid ?? option?.id) === (val?.uuid ?? val?.id)}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      loadingText={formatMessage(intl, "ledger", "ledger.picker.loading")}
      disabled={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          disabled={readOnly}
          label={label || formatMessage(intl, "ledger", "ledger.picker.account")}
          variant="standard"
        />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  options: state.ledger?.accountOptions?.items,
  isFetching: state.ledger?.accountOptions?.isFetching,
  fetchedOptions: state.ledger?.accountOptions?.isFetched,
  error: state.ledger?.accountOptions?.error,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchAccountOptions }, dispatch);

export { AccountPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountPicker));
