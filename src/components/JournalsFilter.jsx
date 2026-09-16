import React from "react";
import { Grid } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ControlledField, GRID_RESPONSIVE_STANDARD, TextInput } from "@openimis/fe-core";
import JournalTypePicker from "../pickers/JournalTypePicker";

const StyledJournalsFilter = styled("section")(({ theme }) => ({
  padding: 0,
  width: "100%",
  "& .item": {
    padding: theme.spacing(1),
  },
}));

/* `ledgerJournal` filters are exact matches: journal name, journal code and the
   journal type (prefixed `type_Id` arg, hence the uuid). */
const JournalsFilter = ({ filters, onChangeFilters }) => {
  const valueOf = (key) => filters?.[key]?.value ?? null;
  const textOf = (key) => filters?.[key]?.value ?? "";

  return (
    <StyledJournalsFilter>
      <Grid container>
        <ControlledField
          module="ledger"
          id="JournalsFilter.name"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="ledger"
                label="ledger.journals.filter.name"
                value={textOf("name")}
                onChange={(value) =>
                  onChangeFilters([{ id: "name", value, filter: value ? `name: "${value}"` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="JournalsFilter.code"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="ledger"
                label="ledger.journals.filter.code"
                value={textOf("code")}
                onChange={(value) =>
                  onChangeFilters([{ id: "code", value, filter: value ? `code: "${value}"` : null }])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="ledger"
          id="JournalsFilter.type"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <JournalTypePicker
                value={valueOf("type")}
                onChange={(value) =>
                  onChangeFilters([
                    {
                      id: "type",
                      value,
                      filter: value?.id ? `type_Id: "${value.id}"` : null,
                    },
                  ])
                }
              />
            </Grid>
          }
        />
      </Grid>
    </StyledJournalsFilter>
  );
};

export default JournalsFilter;
