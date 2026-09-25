import React from "react";
import { injectIntl } from "react-intl";
import { Grid, MenuItem, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ControlledField, GRID_RESPONSIVE_STANDARD, TextInput, formatMessage } from "@openimis/fe-core";
import AccountTypePicker from "../pickers/AccountTypePicker";
import { graphqlString } from "../utils/graphqlLiteral";

const ANY_OPTION = "__any__";

const StyledAccountsFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": {
    padding: theme.spacing(1),
  },
}));

/* Backend `accounts` filters are exact matches only (code, fullCode, type,
   isBankAccount), hence the plain text inputs and selects. */
const AccountsFilter = ({ intl, filters, onChangeFilters }) => {
  const valueOf = (key) => filters?.[key]?.value ?? null;
  const textOf = (key) => filters?.[key]?.value ?? "";

  return (
    <StyledAccountsFilter>
      <Grid container>
        <ControlledField
          module="ledger"
          id="AccountsFilter.code"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="ledger"
                label="ledger.accounts.filter.code"
                value={textOf("code")}
                onChange={(value) =>
                  onChangeFilters([{ id: "code", value, filter: value ? `code: ${graphqlString(value)}` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="AccountsFilter.type"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <AccountTypePicker
                withNull
                value={valueOf("type") === ANY_OPTION ? null : valueOf("type")}
                onChange={(value) =>
                  onChangeFilters([{ id: "type", value: value ?? ANY_OPTION, filter: value ? `type: ${value}` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="AccountsFilter.isBankAccount"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextField
                select
                fullWidth
                variant="standard"
                label={formatMessage(intl, "ledger", "ledger.accounts.filter.isBankAccount")}
                value={valueOf("isBankAccount") === true ? "true" : valueOf("isBankAccount") === false ? "false" : ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const value = raw === "" ? null : raw === "true";
                  onChangeFilters([
                    { id: "isBankAccount", value, filter: value === null ? null : `isBankAccount: ${value}` },
                  ]);
                }}
                inputProps={{ "aria-label": formatMessage(intl, "ledger", "ledger.accounts.filter.isBankAccount") }}
              >
                <MenuItem value="">{formatMessage(intl, "ledger", "ledger.any")}</MenuItem>
                <MenuItem value="true">{formatMessage(intl, "ledger", "ledger.yes")}</MenuItem>
                <MenuItem value="false">{formatMessage(intl, "ledger", "ledger.no")}</MenuItem>
              </TextField>
            </Grid>
          }
        />
      </Grid>
    </StyledAccountsFilter>
  );
};

export default injectIntl(AccountsFilter);
