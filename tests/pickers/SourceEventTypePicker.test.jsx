import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import SourceEventTypePicker from "../../src/pickers/SourceEventTypePicker";

afterEach(() => {
  cleanup();
});

describe("SourceEventTypePicker", () => {
  const renderPicker = (props) =>
    render(
      <IntlProvider locale="en" messages={{}}>
        <SourceEventTypePicker {...props} />
      </IntlProvider>,
    );

  it("renders with default label", () => {
    renderPicker({ value: null, onChange: vi.fn() });
    expect(screen.getByLabelText("ledger.sourceEventType")).toBeInTheDocument();
  });

  it("handles null value", () => {
    renderPicker({ value: null, onChange: vi.fn() });

    const input = screen.getByLabelText("ledger.sourceEventType");
    expect(input).toHaveValue("");
  });

  it("renders with 'any' option when withNull is true", () => {
    renderPicker({ value: null, onChange: vi.fn(), withNull: true });
    expect(screen.getByLabelText("ledger.sourceEventType")).toBeInTheDocument();
  });

  it("renders without 'any' option when withNull is false", () => {
    renderPicker({ value: null, onChange: vi.fn(), withNull: false });
    expect(screen.getByLabelText("ledger.sourceEventType")).toBeInTheDocument();
  });
});