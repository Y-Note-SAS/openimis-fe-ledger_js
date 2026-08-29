import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { fetchAccountingPeriods } from "../actions";

const ANY_OPTION = "__any__";

const AccountingPeriodPicker = ({
  intl,
  value,
  label,
  onChange,
  readOnly = false,
  withNull = false,
  required = false,
  accountingPeriods,
  fetchingAccountingPeriods,
  fetchedAccountingPeriods,
  fetchAccountingPeriods,
}) => {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!fetchedAccountingPeriods && !fetchingAccountingPeriods) {
      fetchAccountingPeriods();
    }
  }, []);

  const options = useMemo(() => {
    const periodOptions = (accountingPeriods || []).map((period) => ({
      value: period.id,
      label: `${period.startDate} — ${period.endDate} (${period.status})`,
    }));
    return withNull
      ? [{ value: ANY_OPTION, label: formatMessage(intl, "ledger", "ledger.any") }, ...periodOptions]
      : periodOptions;
  }, [accountingPeriods, intl, withNull]);

  const selectedOption = options.find((option) => option.value === (value ?? ANY_OPTION)) || null;

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange?.(newValue?.value === ANY_OPTION ? null : (newValue?.value ?? null))}
      getOptionLabel={(option) => option?.label || ""}
      isOptionEqualToValue={(option, currentValue) => option?.value === currentValue?.value}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      readOnly={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || formatMessage(intl, "ledger", "ledger.picker.accountingPeriod")}
          required={required}
          variant="standard"
        />
      )}
    />
  );
};

const mapStateToProps = (state) => ({
  accountingPeriods: state.ledger.accountingPeriods.items,
  fetchingAccountingPeriods: state.ledger.accountingPeriods.isFetching,
  fetchedAccountingPeriods: state.ledger.accountingPeriods.isFetched,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchAccountingPeriods }, dispatch);

export { AccountingPeriodPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountingPeriodPicker));
