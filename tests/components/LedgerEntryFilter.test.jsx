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
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("claim_payment")}>
      source-event-type-claim-payment
    </button>
  ),
}));

describe("LedgerEntryFilter", () => {
  it("sends the source event type as a bare, upper-cased GraphQL enum name", () => {
    const onChangeFilters = vi.fn();

    render(
      <IntlProvider locale="en" messages={{}}>
        <LedgerEntryFilter filters={{}} onChangeFilters={onChangeFilters} />
      </IntlProvider>,
    );

    fireEvent.click(screen.getByText("source-event-type-claim-payment"));

    // GraphQL only accepts the enum NAME, and it must not be quoted.
    expect(onChangeFilters).toHaveBeenCalledWith([
      { id: "sourceEventType", value: "claim_payment", filter: "sourceEventType: CLAIM_PAYMENT" },
    ]);
  });

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
