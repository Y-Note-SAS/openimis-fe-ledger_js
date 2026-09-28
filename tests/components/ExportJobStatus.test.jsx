import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { ExportJobStatus } from "../../src/components/ExportJobStatus";
import { EXPORT_JOB_STATUS } from "../../src/constants";

const renderStatus = (job) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <ExportJobStatus job={job} />
    </IntlProvider>,
  );

describe("ExportJobStatus", () => {
  it("renders an in-progress job with provisional numbering", () => {
    renderStatus({ status: EXPORT_JOB_STATUS.IN_PROGRESS, provisional: true });

    expect(screen.getByRole("status")).toHaveTextContent("ledger.export.status.in_progress");
    expect(screen.getByText("ledger.export.numbering.provisional")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a completed job with final numbering and download link", () => {
    renderStatus({
      status: EXPORT_JOB_STATUS.COMPLETE,
      provisional: false,
      downloadUrl: "/exports/period-1.csv",
    });

    expect(screen.getByRole("status")).toHaveTextContent("ledger.export.status.complete");
    expect(screen.getByText("ledger.export.numbering.final")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/exports/period-1.csv");
  });

  it("renders a failed job with the backend failure message", () => {
    renderStatus({ status: EXPORT_JOB_STATUS.FAILED, failureMessage: "Export failed on the server" });

    expect(screen.getByRole("status")).toHaveTextContent("ledger.export.status.failed");
    expect(screen.getByText("Export failed on the server")).toBeInTheDocument();
  });
});
