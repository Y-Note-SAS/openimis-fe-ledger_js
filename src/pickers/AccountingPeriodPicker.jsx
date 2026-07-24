import React, { useEffect } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { SelectInput, formatMessage } from "@openimis/fe-core";
import { fetchAccountingPeriodsMock } from "../actions";

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
  fetchAccountingPeriodsMock,
}) => {
  useEffect(() => {
    if (!fetchedAccountingPeriods && !fetchingAccountingPeriods) {
      fetchAccountingPeriodsMock();
    }
  }, []);

  const options = (accountingPeriods || []).map((period) => ({
    value: period.id,
    label: `${period.startDate} — ${period.endDate} (${period.status})`,
  }));

  if (withNull) {
    options.unshift({ value: null, label: formatMessage(intl, "ledger", "ledger.any") });
  }

  return (
    <SelectInput
      module="ledger"
      label={label || formatMessage(intl, "ledger", "ledger.picker.accountingPeriod")}
      options={options}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      required={required}
    />
  );
};

const mapStateToProps = (state) => ({
  accountingPeriods: state.ledger.accountingPeriods.items,
  fetchingAccountingPeriods: state.ledger.accountingPeriods.isFetching,
  fetchedAccountingPeriods: state.ledger.accountingPeriods.isFetched,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchAccountingPeriodsMock }, dispatch);

export { AccountingPeriodPicker };
export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AccountingPeriodPicker));
