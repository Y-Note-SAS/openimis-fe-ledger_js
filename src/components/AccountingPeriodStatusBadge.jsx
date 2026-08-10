import React from "react";
import { injectIntl } from "react-intl";
import { Chip } from "@mui/material";
import { formatMessage } from "@openimis/fe-core";
import { ACCOUNTING_PERIOD_STATUS } from "../constants";

const STATUS_COLOR = {
  [ACCOUNTING_PERIOD_STATUS.OPEN]: "success",
  [ACCOUNTING_PERIOD_STATUS.LOCKED]: "warning",
  [ACCOUNTING_PERIOD_STATUS.CLOSED]: "default",
};

const AccountingPeriodStatusBadge = ({ intl, status }) => (
  <Chip
    size="small"
    color={STATUS_COLOR[status] || "default"}
    label={formatMessage(intl, "ledger", `ledger.periods.status.${status}`)}
  />
);

export default injectIntl(AccountingPeriodStatusBadge);
