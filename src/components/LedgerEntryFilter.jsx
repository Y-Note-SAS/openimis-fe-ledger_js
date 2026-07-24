import React from "react";
import { injectIntl } from "react-intl";
import { Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ControlledField,
  TextInput,
  SelectInput,
  formatMessage,
  GRID_RESPONSIVE_STANDARD,
} from "@openimis/fe-core";
import { SOURCE_EVENT_TYPE } from "../constants";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import LedgerJournalPicker from "../pickers/LedgerJournalPicker";

const StyledLedgerEntryFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": {
    padding: theme.spacing(1),
  },
}));

const SOURCE_EVENT_TYPE_OPTIONS = Object.values(SOURCE_EVENT_TYPE).map((value) => ({ value, label: value }));

const LedgerEntryFilter = ({ intl, filters, onChangeFilters }) => {
  const filterValue = (key) => filters?.[key]?.value ?? null;
  const textFilterValue = (key) => filters?.[key]?.value ?? "";

  return (
    <StyledLedgerEntryFilter>
      <Grid container>
        <ControlledField
          module="ledger"
          id="LedgerEntryFilter.journal"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <LedgerJournalPicker
                value={textFilterValue("journal")}
                onChange={(value) =>
                  onChangeFilters([{ id: "journal", value, filter: value ? `journal: "${value}"` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="LedgerEntryFilter.accountingPeriod"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <AccountingPeriodPicker
                withNull
                value={filterValue("accountingPeriodId")}
                onChange={(value) =>
                  onChangeFilters([
                    { id: "accountingPeriodId", value, filter: value ? `accountingPeriod: "${value}"` : null },
                  ])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="LedgerEntryFilter.sourceEventType"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <SelectInput
                module="ledger"
                label={formatMessage(intl, "ledger", "ledger.sourceEventType")}
                options={[
                  { value: null, label: formatMessage(intl, "ledger", "ledger.any") },
                  ...SOURCE_EVENT_TYPE_OPTIONS,
                ]}
                value={filterValue("sourceEventType")}
                onChange={(value) =>
                  onChangeFilters([
                    { id: "sourceEventType", value, filter: value ? `sourceEventType: "${value}"` : null },
                  ])
                }
              />
            </Grid>
          }
        />
      </Grid>
      <Grid container>
        <ControlledField
          module="ledger"
          id="LedgerEntryFilter.party"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="ledger"
                label={formatMessage(intl, "ledger", "ledger.party")}
                value={textFilterValue("partyAnalyticValueId")}
                onChange={(value) =>
                  onChangeFilters([{ id: "partyAnalyticValueId", value, filter: value ? `party: "${value}"` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="LedgerEntryFilter.funder"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="ledger"
                label={formatMessage(intl, "ledger", "ledger.funder")}
                value={textFilterValue("funderAnalyticValueId")}
                onChange={(value) =>
                  onChangeFilters([{ id: "funderAnalyticValueId", value, filter: value ? `funder: "${value}"` : null }])
                }
              />
            </Grid>
          }
        />
      </Grid>
    </StyledLedgerEntryFilter>
  );
};

export default injectIntl(LedgerEntryFilter);
