import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { PeriodExportPage } from "../../src/pages/PeriodExportPage";
import { RIGHT_LEDGER_ADMIN } from "../../src/constants";

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
    rights: [RIGHT_LEDGER_ADMIN],
    accountingPeriods: {
      items: [{ id: "period-1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" }],
    },
    exportJobs: { byPeriodId: {} },
    fetchAccountingPeriodsMock: vi.fn(),
    exportAccountingPeriod: vi.fn(),
    pollExportJob: vi.fn(() => vi.fn()),
    exportAccountingPeriodMock: vi.fn(),
    pollExportJobMock: vi.fn(() => vi.fn()),
    ...props,
  };

  return render(
    <IntlProvider locale="en" messages={{}}>
      <PeriodExportPage {...pageProps} />
    </IntlProvider>,
  );
};

describe("PeriodExportPage", () => {
  it("denies access without the finance administrator right", () => {
    const fetchAccountingPeriodsMock = vi.fn();
    renderPage({ rights: [], fetchAccountingPeriodsMock });

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(fetchAccountingPeriodsMock).not.toHaveBeenCalled();
  });

  it("shows both export formats and triggers the selected generic export", () => {
    const exportAccountingPeriod = vi.fn();
    const pollExportJob = vi.fn(() => vi.fn());
    const exportAccountingPeriodMock = vi.fn();
    const pollExportJobMock = vi.fn(() => vi.fn());
    renderPage({ exportAccountingPeriod, pollExportJob, exportAccountingPeriodMock, pollExportJobMock });

    expect(screen.getByText("ledger.export.formats.generic")).toBeInTheDocument();
    expect(screen.getByText("ledger.export.formats.ohadaFec")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ledger.export.period"), { target: { value: "period-1" } });
    fireEvent.click(screen.getByText("ledger.export.trigger"));

    expect(exportAccountingPeriodMock).toHaveBeenCalledWith("period-1", "generic", true);
    expect(pollExportJobMock).toHaveBeenCalledWith("period-1", "generic", true);
  });

  it("shows the export error message when provided", () => {
    renderPage({ exportJobs: { byPeriodId: {}, error: "Network error" } });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
