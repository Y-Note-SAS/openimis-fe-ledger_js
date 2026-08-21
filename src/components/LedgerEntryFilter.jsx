import React from "react";
import { injectIntl } from "react-intl";
import { Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ControlledField,
  GRID_RESPONSIVE_STANDARD,
} from "@openimis/fe-core";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import LedgerJournalPicker from "../pickers/LedgerJournalPicker";
import PartyPicker from "../pickers/PartyPicker";
import FunderPicker from "../pickers/FunderPicker";
import SourceEventTypePicker from "../pickers/SourceEventTypePicker";

const ALL_PERIODS_FILTER_VALUE = "__all__";

const StyledLedgerEntryFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": {
    padding: theme.spacing(1),
  },
}));

const LedgerEntryFilter = ({ intl, filters, onChangeFilters }) => {
  const filterValue = (key) => {
    const value = filters?.[key]?.value;
    return value === ALL_PERIODS_FILTER_VALUE ? null : (value ?? null);
  };
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
                  onChangeFilters([
                    {
                      id: "journal",
                      value: value?.code ?? null,
                      filter: value?.code ? `journal: "${value.code}"` : null,
                    },
                  ])
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
                    {
                      id: "accountingPeriodId",
                      value: value ?? ALL_PERIODS_FILTER_VALUE,
                      filter: `accountingPeriod: "${value ?? ALL_PERIODS_FILTER_VALUE}"`,
                    },
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
              <SourceEventTypePicker
                withNull
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
              <PartyPicker
                value={filterValue("partyAnalyticValueId")}
                onChange={(value) =>
                  onChangeFilters([
                    {
                      id: "partyAnalyticValueId",
                      value,
                      filter: value?.analyticValueId ? `party: "${value.analyticValueId}"` : null,
                    },
                  ])
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
              <FunderPicker
                value={filterValue("funderAnalyticValueId")}
                onChange={(value) =>
                  onChangeFilters([
                    {
                      id: "funderAnalyticValueId",
                      value,
                      filter: value?.analyticValueId ? `funder: "${value.analyticValueId}"` : null,
                    },
                  ])
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
