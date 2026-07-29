import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountingPeriodPicker } from "../../src/pickers/AccountingPeriodPicker";

const baseProps = {
  intl: {},
  value: "",
  onChange: vi.fn(),
  accountingPeriods: [],
  fetchingAccountingPeriods: false,
  fetchedAccountingPeriods: false,
  fetchAccountingPeriods: vi.fn(),
};

describe("AccountingPeriodPicker", () => {
  it("fetches accounting periods on mount when data is not yet loaded", () => {
    const fetchAccountingPeriods = vi.fn();

    render(
      <AccountingPeriodPicker
        {...baseProps}
        fetchAccountingPeriods={fetchAccountingPeriods}
      />,
    );

    expect(fetchAccountingPeriods).toHaveBeenCalledTimes(1);
  });

  it("does not fetch on mount when data is already loaded or loading", () => {
    const fetchAccountingPeriods = vi.fn();
    const { rerender } = render(
      <AccountingPeriodPicker
        {...baseProps}
        fetchAccountingPeriods={fetchAccountingPeriods}
        fetchedAccountingPeriods
      />,
    );

    rerender(
      <AccountingPeriodPicker
        {...baseProps}
        fetchAccountingPeriods={fetchAccountingPeriods}
        fetchingAccountingPeriods
      />,
    );

    expect(fetchAccountingPeriods).not.toHaveBeenCalled();
  });

  it("renders accounting period options and prepends the null option when withNull is enabled", () => {
    render(
      <AccountingPeriodPicker
        {...baseProps}
        withNull
        fetchedAccountingPeriods
        accountingPeriods={[
          { id: "p1", startDate: "2026-07-01", endDate: "2026-07-31", status: "open" },
          { id: "p2", startDate: "2026-06-01", endDate: "2026-06-30", status: "closed" },
        ]}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("ledger.any");
    expect(options[1]).toHaveTextContent("2026-07-01");
    expect(options[1]).toHaveTextContent("2026-07-31");
    expect(options[1]).toHaveTextContent("open");
    expect(options[2]).toHaveTextContent("2026-06-01");
    expect(options[2]).toHaveTextContent("2026-06-30");
    expect(options[2]).toHaveTextContent("closed");
  });
});
