import React, { useEffect, useMemo, useState } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import {
  Alert,
  Box,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  GRID_RESPONSIVE_STANDARD,
  Helmet,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
} from "@openimis/fe-core";
import PartyPicker from "../pickers/PartyPicker";
import AccountingPeriodPicker from "../pickers/AccountingPeriodPicker";
import { hasLedgerReportingRight } from "../utils/permissions";
import { formatSignedBalance } from "../utils/balance";
import { fetchPartyLedgerBalance } from "../actions";

const MOCK_PARTY_LEDGER = {
  balance: 18500,
  carriedForwardBalance: 12000,
  transactions: [
    {
      id: "mock-tx-1",
      journal: { code: "BANK", name: "Bank journal" },
      postedAt: "2026-07-03",
      totals: { debit: 12500, credit: 12500, balance: 0 },
    },
    {
      id: "mock-tx-2",
      journal: { code: "SALES", name: "Sales journal" },
      postedAt: "2026-07-11",
      totals: { debit: 7800, credit: 7800, balance: 0 },
    },
    {
      id: "mock-tx-3",
      journal: { code: "ADJ", name: "Adjustment journal" },
      postedAt: "2026-07-24",
      totals: { debit: 8700, credit: 8700, balance: 0 },
    },
  ],
};

const StyledPage = styled("div")(({ theme }) => ({
  "& .page": theme.page ?? {},
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...(theme?.paper?.paper ?? {}),
  boxShadow: "none",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
  "& .paperHeader": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0, 1),
    minHeight: "40px",
    width: "100%",
    color: theme.paper?.header?.color || theme.palette.primary.main,
    ...theme.paper?.header,
    backgroundColor: theme.paper?.header?.backgroundColor || theme.palette.primary.light,
  },
  "& .paperHeaderTitle": {
    ...theme.paper?.title,
    backgroundColor: "transparent",
    padding: theme.spacing(0.5, 1),
    border: "none",
    flexGrow: 1,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .paperBody": {
    padding: theme.spacing(2),
  },
  "& .item": theme.paper?.item ?? {},
}));

const PartyLedgerPage = ({ intl, rights, partyLedgerBalance, fetchPartyLedgerBalance }) => {
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);

  if (!hasLedgerReportingRight(rights)) {
    return null;
  }

  const ledgerData = partyLedgerBalance?.data || null;
  const useMockLedger =
    !!selectedParty?.analyticValueId &&
    !!selectedPeriodId &&
    (!ledgerData || (ledgerData.transactions || []).length === 0);
  const displayLedger = useMockLedger ? MOCK_PARTY_LEDGER : ledgerData;
  const balanceInfo = useMemo(() => formatSignedBalance(displayLedger?.balance ?? 0), [displayLedger?.balance]);

  const transactions = displayLedger?.transactions || [];
  const carriedForwardBalance = displayLedger?.carriedForwardBalance ?? 0;

  useEffect(() => {
    if (selectedParty?.analyticValueId && selectedPeriodId) {
      fetchPartyLedgerBalance(selectedParty.analyticValueId, selectedPeriodId);
    }
  }, [fetchPartyLedgerBalance, selectedParty?.analyticValueId, selectedPeriodId]);

  return (
    <StyledPage>
      <div className="page">
        <Helmet title={formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")} />
        <Grid container direction="column">
          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.pageTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container className="paperBody">
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <PartyPicker value={selectedParty} onChange={setSelectedParty} />
                </Grid>
                <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
                  <AccountingPeriodPicker value={selectedPeriodId} onChange={setSelectedPeriodId} />
                </Grid>
              </Grid>
            </StyledPaper>
          </Grid>

          <Grid size={12}>
            <StyledPaper className="paper">
              <Grid container alignItems="center" direction="row" className="paperHeader">
                <Grid className="paperHeaderTitle">
                  <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.balanceTitle")}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <Box className="paperBody">
                <Typography variant="h4">{balanceInfo.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatMessage(intl, "ledger", `ledger.balance.${balanceInfo.legend}`)}
                </Typography>
              </Box>
            </StyledPaper>
          </Grid>

          {useMockLedger ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">
                  Demo data shown until the real backend response is available for this party and period.
                </Alert>
              </Box>
            </Grid>
          ) : null}

          {transactions.length === 0 ? (
            <Grid size={12}>
              <Box className="paperBody">
                <Alert severity="info">
                  {formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.emptyState", {
                    carriedForwardBalance,
                  })}
                </Alert>
              </Box>
            </Grid>
          ) : (
            <Grid size={12}>
              <StyledPaper className="paper">
                <Grid container alignItems="center" direction="row" className="paperHeader">
                  <Grid className="paperHeaderTitle">
                    <Typography>{formatMessage(intl, "ledger", "ledger.partyLedgerPage.statementTitle")}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Box className="paperBody" sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.entry.journal")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.entry.postedAt")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.entry.debit")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.entry.credit")}</TableCell>
                        <TableCell>{formatMessage(intl, "ledger", "ledger.entry.balance")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.journal?.code || transaction.journal?.name || "-"}</TableCell>
                          <TableCell>{transaction.postedAt || "-"}</TableCell>
                          <TableCell>{transaction.totals?.debit ?? 0}</TableCell>
                          <TableCell>{transaction.totals?.credit ?? 0}</TableCell>
                          <TableCell>{transaction.totals?.balance ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </StyledPaper>
            </Grid>
          )}

          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" className="paperBody">
              {selectedParty?.displayName
                ? formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.selectedParty", {
                    party: selectedParty.displayName,
                  })
                : formatMessage(intl, "ledger", "ledger.partyLedgerPage.noPartySelected")}
              {" · "}
              {selectedPeriodId
                ? formatMessageWithValues(intl, "ledger", "ledger.partyLedgerPage.selectedPeriod", {
                    period: selectedPeriodId,
                  })
                : formatMessage(intl, "ledger", "ledger.partyLedgerPage.noPeriodSelected")}
            </Typography>
          </Grid>
        </Grid>
      </div>
    </StyledPage>
  );
};

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  partyLedgerBalance: state.ledger.partyLedgerBalance,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPartyLedgerBalance }, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PartyLedgerPage)));
