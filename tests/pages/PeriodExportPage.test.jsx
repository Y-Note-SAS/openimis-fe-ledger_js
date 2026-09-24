import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { PeriodExportPage } from "../../src/pages/PeriodExportPage";
import { RIGHT_LEDGER_ADMIN, RIGHT_LEDGER_REPORTING } from "../../src/constants";

vi.mock("../../src/pickers/AccountingPeriodPicker", () => ({
  default: ({ label, onChange }) => (
    <select aria-label={label} onChange={(event) => onChange(event.target.value)} defaultValue="">
      <option value="">Select period</option>
      <option value="period-1">2026-07-01 — 2026-07-31</option>
    </select>
  ),
}));

const renderPage = (props = {}) => {
  const pageProps = {
    intl: {},
    rights: [RIGHT_LEDGER_REPORTING],
    accountingPeriods: {
      items: [{ id: "period-1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" }],
    },
    exportDownload: { isFetching: false, error: null },
    fetchAccountingPeriods: vi.fn(),
    downloadPeriodRegister: vi.fn(),
    ...props,
  };

  return render(
    <IntlProvider locale="en" messages={{}}>
      <PeriodExportPage {...pageProps} />
    </IntlProvider>,
  );
};

describe("PeriodExportPage", () => {
  it("denies access without the ledger reporting right and does not load the periods", () => {
    const fetchAccountingPeriods = vi.fn();
    renderPage({ rights: [], fetchAccountingPeriods });

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(fetchAccountingPeriods).not.toHaveBeenCalled();
  });

  it("is also available to ledger administrators", () => {
    const fetchAccountingPeriods = vi.fn();
    renderPage({ rights: [RIGHT_LEDGER_ADMIN], fetchAccountingPeriods });

    expect(fetchAccountingPeriods).toHaveBeenCalled();
    expect(screen.queryByText("ledger.accessDenied")).not.toBeInTheDocument();
  });

  it("shows both registers and downloads the selected one", () => {
    const downloadPeriodRegister = vi.fn();
    renderPage({ downloadPeriodRegister });

    expect(screen.getByText("ledger.export.formats.standard")).toBeInTheDocument();
    expect(screen.getByText("ledger.export.formats.fec")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.export.period"), { target: { value: "period-1" } });
    // The general ledger is the default register.
    fireEvent.click(screen.getByText("ledger.export.trigger"));

    expect(downloadPeriodRegister).toHaveBeenCalledWith("period-1", "standard");
  });

  it("downloads the OHADA/FEC register when it is selected", () => {
    const downloadPeriodRegister = vi.fn();
    renderPage({ downloadPeriodRegister });

    fireEvent.change(screen.getByLabelText("ledger.export.period"), { target: { value: "period-1" } });
    fireEvent.change(screen.getByLabelText("ledger.export.format"), { target: { value: "fec" } });
    fireEvent.click(screen.getByText("ledger.export.trigger"));

    expect(downloadPeriodRegister).toHaveBeenCalledWith("period-1", "fec");
  });

  it("keeps the download disabled until a period is selected", () => {
    const downloadPeriodRegister = vi.fn();
    renderPage({ downloadPeriodRegister });

    fireEvent.click(screen.getByText("ledger.export.trigger"));

    expect(downloadPeriodRegister).not.toHaveBeenCalled();
  });

  it("disables the download while a register is being fetched", () => {
    const downloadPeriodRegister = vi.fn();
    renderPage({ downloadPeriodRegister, exportDownload: { isFetching: true, error: null } });

    fireEvent.change(screen.getByLabelText("ledger.export.period"), { target: { value: "period-1" } });
    fireEvent.click(screen.getByText("ledger.export.trigger"));

    expect(downloadPeriodRegister).not.toHaveBeenCalled();
  });

  it("displays the failure returned by the backend", () => {
    renderPage({ exportDownload: { isFetching: false, error: "ledger.export.errors.forbidden" } });

    expect(screen.getByText("ledger.export.errors.forbidden")).toBeInTheDocument();
  });
});
