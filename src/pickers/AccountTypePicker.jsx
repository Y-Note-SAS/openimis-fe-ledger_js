import React, { useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { Autocomplete, TextField } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { ACCOUNT_TYPE } from "../constants";

const ANY_OPTION = "__any__";

/* Account type picker (hordak AccountType: AS/LI/IN/EX/EQ/TR). The backend
   exposes the type as a GraphQL enum whose names match the stored values, so
   the picker value is the raw code and the label is translated frontend-side
   from the `ledger.accountTypeValue.<code>` keys. */
const AccountTypePicker = ({ intl, value, onChange, withNull = false }) => {
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(() => {
    const values = Object.values(ACCOUNT_TYPE).map((accountType) => ({
      value: accountType,
      label: formatMessage(intl, "ledger", `ledger.accountTypeValue.${accountType}`),
    }));
    return withNull ? [{ value: ANY_OPTION, label: formatMessage(intl, "ledger", "ledger.any") }, ...values] : values;
  }, [intl, withNull]);

  const selectedOption = options.find((option) => option.value === (value ?? ANY_OPTION)) || null;

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={(_, newValue) => onChange?.(newValue?.value === ANY_OPTION ? null : newValue?.value ?? null)}
      getOptionLabel={(option) => option?.label || ""}
      isOptionEqualToValue={(option, currentValue) => option?.value === currentValue?.value}
      noOptionsText={formatMessage(intl, "ledger", "ledger.picker.noOptions")}
      renderInput={(params) => (
        <TextField {...params} label={formatMessage(intl, "ledger", "ledger.accountType")} variant="standard" />
      )}
    />
  );
};

export default injectIntl(AccountTypePicker);
