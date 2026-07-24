import React from "react";
import { injectIntl } from "react-intl";
import { TextInput, formatMessage } from "@openimis/fe-core";

// NOTE (contracts/graphql-operations.md): `ledgerEntries(journal: String, ...)`
// takes a plain string, not an ID referencing a Journal entity, and no
// `journals` reference-data query exists in the contract. This picker is
// therefore a free-text field on the journal code rather than an async
// dropdown; revisit if/when the backend exposes a journals reference query.
const LedgerJournalPicker = ({ intl, value, label, onChange, readOnly = false }) => (
  <TextInput
    module="ledger"
    label={label || formatMessage(intl, "ledger", "ledger.journal")}
    value={value || ""}
    onChange={onChange}
    readOnly={readOnly}
  />
);

export default injectIntl(LedgerJournalPicker);
