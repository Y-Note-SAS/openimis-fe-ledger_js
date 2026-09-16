import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { ManualReviewResolutionDialog } from "../../src/components/ManualReviewResolutionDialog";

const pendingItem = {
  id: "review-1",
  // The backend exposes the replication status as the GraphQL enum name.
  status: "PENDING",
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

    // Only the same-party/same-period entry is offered as a correcting entry.
    expect(screen.getByRole("option", { name: /correction-1/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /wrong-party/ })).not.toBeInTheDocument();
  });

  it("submits the selected correcting entry and trimmed resolution note", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    renderDialog(pendingItem, onResolve);

    await user.selectOptions(screen.getByRole("combobox"), "correction-1");
    await user.type(screen.getByLabelText("ledger.reviewQueue.dialog.resolutionNote"), "  Corrected manually  ");
    await user.click(screen.getByText("ledger.reviewQueue.dialog.resolve"));

    expect(onResolve).toHaveBeenCalledWith("review-1", "correction-1", "Corrected manually");
  });

  it("renders resolved items read-only without resolution controls", () => {
    renderDialog({
      ...pendingItem,
      status: "SUCCEEDED",
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
