import { flatten } from "flat";
import messages_en from "./translations/en.json";
import reducer from "./reducer";
import GeneralLedgerPage from "./pages/GeneralLedgerPage";
import PartyLedgerPage from "./pages/PartyLedgerPage";
import FunderActivityPage from "./pages/FunderActivityPage";
import AccountingPeriodsPage from "./pages/AccountingPeriodsPage";
import ManualReviewQueuePage from "./pages/ManualReviewQueuePage";
import PeriodExportPage from "./pages/PeriodExportPage";
import DeploymentConfigurationPage from "./pages/DeploymentConfigurationPage";
import JournalsPage from "./pages/JournalsPage";
import AccountsPage from "./pages/AccountsPage";
import AccountingPeriodPicker from "./pickers/AccountingPeriodPicker";
import LedgerJournalPicker from "./pickers/LedgerJournalPicker";
import JournalTypePicker from "./pickers/JournalTypePicker";
import AccountPicker from "./pickers/AccountPicker";
import PartyPicker from "./pickers/PartyPicker";
import FunderPicker from "./pickers/FunderPicker";
import { buildLedgerSubMenuEntry } from "./menus/LedgerMainMenu";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "./constants";

// Route paths
const ROUTE_GENERAL_LEDGER = "ledger/general";
const ROUTE_PARTY_LEDGER = "ledger/party";
const ROUTE_FUNDER_ACTIVITY = "ledger/funder";
const ROUTE_ACCOUNTING_PERIODS = "ledger/periods";
const ROUTE_JOURNALS = "ledger/journals";
const ROUTE_MANUAL_REVIEW_QUEUE = "ledger/review-queue";
const ROUTE_PERIOD_EXPORT = "ledger/export";
const ROUTE_DEPLOYMENT_CONFIGURATION = "ledger/deployment";
const ROUTE_ACCOUNTS = "ledger/accounts";

const READ_RIGHTS = [RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN];
const ADMIN_ONLY_RIGHTS = [RIGHT_LEDGER_ADMIN];

const DEFAULT_CONFIG = {
  translations: [{ key: "en", messages: flatten(messages_en) }],
  reducers: [{ key: "ledger", reducer }],
  "core.Router": [
    {
      path: ROUTE_GENERAL_LEDGER,
      id: "ledger.generalLedger",
      component: GeneralLedgerPage,
      rights: READ_RIGHTS,
      icon: "AccountBalance",
      text: "ledger.menu.generalLedger",
    },
    {
      path: ROUTE_PARTY_LEDGER,
      id: "ledger.partyLedger",
      component: PartyLedgerPage,
      rights: READ_RIGHTS,
      icon: "Person",
      text: "ledger.menu.partyLedger",
    },
    {
      path: ROUTE_FUNDER_ACTIVITY,
      id: "ledger.funderActivity",
      component: FunderActivityPage,
      rights: READ_RIGHTS,
      icon: "AccountBalanceWallet",
      text: "ledger.menu.funderActivity",
    },
    {
      path: ROUTE_ACCOUNTING_PERIODS,
      id: "ledger.accountingPeriods",
      component: AccountingPeriodsPage,
      rights: READ_RIGHTS,
      icon: "DateRange",
      text: "ledger.menu.accountingPeriods",
    },
    {
      path: ROUTE_JOURNALS,
      id: "ledger.journals",
      component: JournalsPage,
      rights: READ_RIGHTS,
      icon: "MenuBook",
      text: "ledger.menu.journals",
    },
    {
      path: ROUTE_MANUAL_REVIEW_QUEUE,
      id: "ledger.manualReviewQueue",
      component: ManualReviewQueuePage,
      rights: ADMIN_ONLY_RIGHTS,
      icon: "Rule",
      text: "ledger.menu.manualReviewQueue",
    },
    {
      path: ROUTE_PERIOD_EXPORT,
      id: "ledger.periodExport",
      component: PeriodExportPage,
      rights: ADMIN_ONLY_RIGHTS,
      icon: "FileDownload",
      text: "ledger.menu.periodExport",
    },
    {
      path: ROUTE_ACCOUNTS,
      id: "ledger.accounts",
      component: AccountsPage,
      rights: READ_RIGHTS,
      icon: "AccountTree",
      text: "ledger.menu.accounts",
    },
    {
      path: ROUTE_DEPLOYMENT_CONFIGURATION,
      id: "ledger.deploymentConfiguration",
      component: DeploymentConfigurationPage,
      rights: ADMIN_ONLY_RIGHTS,
      icon: "Settings",
      text: "ledger.menu.deploymentConfiguration",
    },
  ],
  refs: [
    { key: "ledger.route.generalLedger", ref: ROUTE_GENERAL_LEDGER },
    { key: "ledger.route.partyLedger", ref: ROUTE_PARTY_LEDGER },
    { key: "ledger.route.funderActivity", ref: ROUTE_FUNDER_ACTIVITY },
    { key: "ledger.route.accountingPeriods", ref: ROUTE_ACCOUNTING_PERIODS },
    { key: "ledger.route.journals", ref: ROUTE_JOURNALS },
    { key: "ledger.route.manualReviewQueue", ref: ROUTE_MANUAL_REVIEW_QUEUE },
    { key: "ledger.route.periodExport", ref: ROUTE_PERIOD_EXPORT },
    { key: "ledger.route.accounts", ref: ROUTE_ACCOUNTS },
    { key: "ledger.route.deploymentConfiguration", ref: ROUTE_DEPLOYMENT_CONFIGURATION },
    { key: "ledger.AccountingPeriodPicker", ref: AccountingPeriodPicker },
    { key: "ledger.LedgerJournalPicker", ref: LedgerJournalPicker },
    { key: "ledger.JournalTypePicker", ref: JournalTypePicker },
    { key: "ledger.AccountPicker", ref: AccountPicker },
    { key: "ledger.PartyPicker", ref: PartyPicker },
    { key: "ledger.FunderPicker", ref: FunderPicker },
  ],
  "invoice.MainMenu": [
    buildLedgerSubMenuEntry({
      ROUTE_GENERAL_LEDGER,
      ROUTE_PARTY_LEDGER,
      ROUTE_FUNDER_ACTIVITY,
      ROUTE_ACCOUNTING_PERIODS,
      ROUTE_JOURNALS,
      ROUTE_MANUAL_REVIEW_QUEUE,
      ROUTE_PERIOD_EXPORT,
      ROUTE_ACCOUNTS,
      ROUTE_DEPLOYMENT_CONFIGURATION,
    }),
  ],
};

export const LedgerModule = (cfg) => {
  return { ...DEFAULT_CONFIG, ...cfg };
};
