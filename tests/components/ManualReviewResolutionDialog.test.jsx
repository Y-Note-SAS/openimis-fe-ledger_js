import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { ManualReviewResolutionDialog } from "../../src/components/ManualReviewResolutionDialog";

const pendingItem = {
  id: "review-1",
  status: "pending",
  rejectionReason: "Replication rejected",
  originalEntry: {
    id: "original-1",
    partyAnalyticValueId: "party-1",
    accountingPeriodId: "period-1",
  },
};

const entries = [
  {
    id: "correction-1",
    postedAt: "2026-08-01",
    journal: { code: "MISC" },
    accountingPeriod: { id: "period-1" },
    lines: [{ partyTag: { analyticValueId: "party-1" } }],
  },
  {
    id: "wrong-party",
    accountingPeriod: { id: "period-1" },
    lines: [{ partyTag: { analyticValueId: "party-2" } }],
  },
];

const renderDialog = (item = pendingItem, onResolve = vi.fn(), error = null) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <ManualReviewResolutionDialog
        intl={{}}
        item={item}
        ledgerEntries={entries}
        error={error}
        open
        onClose={vi.fn()}
        onResolve={onResolve}
      />
    </IntlProvider>,
  );

describe("ManualReviewResolutionDialog", () => {
  it("shows the rejection reason and only same-party/same-period candidates", () => {
    renderDialog();

    expect(screen.getByText("Replication rejected")).toBeInTheDocument();
    expect(screen.getByText(/original-1/)).toBeInTheDocument();
    expect(screen.getByText(/correction-1/)).toBeInTheDocument();
    expect(screen.queryByText(/wrong-party/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit/)).not.toBeInTheDocument();
  });

  it("submits the selected correcting entry and trimmed resolution note", () => {
    const onResolve = vi.fn();
    renderDialog(pendingItem, onResolve);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "correction-1" } });
    fireEvent.change(screen.getByLabelText("ledger.reviewQueue.dialog.resolutionNote"), {
      target: { value: "  Corrected manually  " },
    });
    fireEvent.click(screen.getByText("ledger.reviewQueue.dialog.resolve"));

    expect(onResolve).toHaveBeenCalledWith("review-1", "correction-1", "Corrected manually");
  });

  it("renders resolved items read-only without resolution controls", () => {
    renderDialog({
      ...pendingItem,
      status: "resolved",
      correctingEntryId: "correction-1",
      resolutionNote: "Already corrected",
    });

    expect(screen.getByText(/Already corrected/)).toBeInTheDocument();
    expect(screen.queryByText("ledger.reviewQueue.dialog.resolve")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders the resolution error message when provided", () => {
    renderDialog(pendingItem, vi.fn(), "Network error");

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
