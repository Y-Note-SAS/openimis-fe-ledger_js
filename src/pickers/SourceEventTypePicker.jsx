import React, { useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { SOURCE_EVENT_TYPE } from "../constants";

const ANY_OPTION = "__any__";

const SourceEventTypePicker = ({ intl, value, onChange, withNull = false }) => {
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(() => {
    const values = Object.values(SOURCE_EVENT_TYPE).map((sourceEventType) => ({
      value: sourceEventType,
      label: formatMessage(intl, "ledger", `ledger.sourceEventTypeValue.${sourceEventType}`),
    }));
    return withNull
      ? [{ value: ANY_OPTION, label: formatMessage(intl, "ledger", "ledger.any") }, ...values]
      : values;
  }, [intl, withNull]);

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
      renderInput={(params) => (
        <TextField
          {...params}
          label={formatMessage(intl, "ledger", "ledger.sourceEventType")}
          variant="standard"
        />
      )}
    />
  );
};

export default injectIntl(SourceEventTypePicker);
