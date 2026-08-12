import React, { useEffect } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { Alert } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Helmet, withModulesManager, formatMessage, clearCurrentPaginationPage } from "@openimis/fe-core";
import { hasLedgerReportingRight } from "../utils/permissions";
import { MODULE_NAME } from "../constants";
import LedgerEntrySearcher from "../components/LedgerEntrySearcher";

const StyledGeneralLedgerPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

const GeneralLedgerPage = ({ 
  intl, 
  rights, 
  module, 
  clearCurrentPaginationPage 
}) => {
  useEffect(() => {
    if (module !== MODULE_NAME) {
      clearCurrentPaginationPage();
    }
  }, [module, clearCurrentPaginationPage]);

  if (!hasLedgerReportingRight(rights)) {
    return <Alert severity="error">{formatMessage(intl, "ledger", "ledger.accessDenied")}</Alert>;
  }

  return (
    <StyledGeneralLedgerPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.entries.pageTitle")} />
        <LedgerEntrySearcher />
      </div>
    </StyledGeneralLedgerPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  module: state.core?.savedPagination?.module,
});

const mapDispatchToProps = {
  clearCurrentPaginationPage,
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(GeneralLedgerPage)));
