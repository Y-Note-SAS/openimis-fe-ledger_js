import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import LedgerJournalPicker from "../../src/pickers/LedgerJournalPicker";

afterEach(() => {
  cleanup();
});

describe("LedgerJournalPicker", () => {
  const renderPicker = (props) =>
    render(
      <IntlProvider locale="en" messages={{}}>
        <LedgerJournalPicker {...props} />
      </IntlProvider>,
    );

  it("propagates typed values through onChange", () => {
    const onChange = vi.fn();

    renderPicker({ value: "", onChange });

    fireEvent.change(screen.getByLabelText("ledger.picker.journal"), {
      target: { value: "BANK" },
    });

    expect(onChange).toHaveBeenCalledWith("BANK");
  });

  it("renders the field as read-only when requested", () => {
    renderPicker({ value: "BANK", onChange: vi.fn(), readOnly: true });

    expect(screen.getByLabelText("ledger.picker.journal")).toHaveAttribute("readonly");
  });
});
