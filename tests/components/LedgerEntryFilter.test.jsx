import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import LedgerEntryFilter from "../../src/components/LedgerEntryFilter";

vi.mock("../../src/pickers/AccountingPeriodPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange(null)}>
      accounting-period-any
    </button>
  ),
}));

vi.mock("../../src/pickers/LedgerJournalPicker", () => ({
  default: () => <div>journal-picker</div>,
}));

vi.mock("../../src/pickers/PartyPicker", () => ({
  default: () => <div>party-picker</div>,
}));

vi.mock("../../src/pickers/FunderPicker", () => ({
  default: () => <div>funder-picker</div>,
}));

vi.mock("../../src/pickers/SourceEventTypePicker", () => ({
  default: () => <div>source-event-type-picker</div>,
}));

describe("LedgerEntryFilter", () => {
  it("emits the explicit all-periods marker when the period filter is cleared", () => {
    const onChangeFilters = vi.fn();

    render(
      <IntlProvider locale="en" messages={{}}>
        <LedgerEntryFilter filters={{}} onChangeFilters={onChangeFilters} />
      </IntlProvider>,
    );

    fireEvent.click(screen.getByText("accounting-period-any"));

    expect(onChangeFilters).toHaveBeenCalledWith([
      {
        id: "accountingPeriodId",
        value: "__all__",
        filter: 'accountingPeriod: "__all__"',
      },
    ]);
  });
});
