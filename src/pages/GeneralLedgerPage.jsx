import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { styled } from "@mui/material/styles";
import { Helmet, withModulesManager, formatMessage, clearCurrentPaginationPage } from "@openimis/fe-core";
import { hasLedgerReportingRight } from "../utils/permissions";
import { MODULE_NAME } from "../constants";
import LedgerEntrySearcher from "../components/LedgerEntrySearcher";

const StyledGeneralLedgerPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

class GeneralLedgerPage extends Component {
  componentDidMount = () => {
    if (this.props.module !== MODULE_NAME) {
      this.props.clearCurrentPaginationPage();
    }
  };

  render() {
    const { intl, rights } = this.props;
    if (!hasLedgerReportingRight(rights)) {
      return null;
    }

    return (
      <StyledGeneralLedgerPage>
        <div className="page">
          <Helmet title={formatMessage(intl, "ledger", "ledger.entries.pageTitle")} />
          <LedgerEntrySearcher />
        </div>
      </StyledGeneralLedgerPage>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  module: state.core?.savedPagination?.module,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ clearCurrentPaginationPage }, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(GeneralLedgerPage)));