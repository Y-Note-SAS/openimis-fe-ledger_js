import React from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Typography } from "@mui/material";
import { Helmet, withModulesManager, formatMessage } from "@openimis/fe-core";

const PartyLedgerPage = ({ intl }) => {
  return (
    <div className="page">
      <Helmet title={formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")} />
      <Typography variant="h6" style={{ textAlign: "center", padding: 40 }}>
        This is the Party Ledger Page
      </Typography>
    </div>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
});

const mapDispatchToProps = (dispatch) => bindActionCreators({}, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PartyLedgerPage)));
