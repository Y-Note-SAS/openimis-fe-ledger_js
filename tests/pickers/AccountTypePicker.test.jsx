import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import AccountTypePicker from "../../src/pickers/AccountTypePicker";
import { ACCOUNT_TYPE } from "../../src/constants";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPicker = (props) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <AccountTypePicker {...props} />
    </IntlProvider>,
  );

describe("AccountTypePicker", () => {
  it("renders the account type label and every backend type", () => {
    const { container } = renderPicker({ value: null, onChange: vi.fn() });

    expect(screen.getByLabelText("ledger.accountType")).toBeInTheDocument();
    expect(container.querySelectorAll("option")).toHaveLength(Object.values(ACCOUNT_TYPE).length + 1);
  });

  it("adds an 'any' option when withNull is set", () => {
    const { container } = renderPicker({ value: null, onChange: vi.fn(), withNull: true });

    expect(container.querySelectorAll("option")).toHaveLength(Object.values(ACCOUNT_TYPE).length + 2);
  });

  it("reports the selected raw type code", () => {
    const onChange = vi.fn();
    renderPicker({ value: null, onChange });

    fireEvent.change(screen.getByLabelText("autocomplete-options"), { target: { value: "LI" } });

    expect(onChange).toHaveBeenCalledWith("LI");
  });

  it("reports null when the 'any' option is selected", () => {
    const onChange = vi.fn();
    renderPicker({ value: "AS", onChange, withNull: true });

    fireEvent.change(screen.getByLabelText("autocomplete-options"), { target: { value: "__any__" } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
