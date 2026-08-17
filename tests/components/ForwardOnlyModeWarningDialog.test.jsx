import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { ForwardOnlyModeWarningDialog } from "../../src/components/ForwardOnlyModeWarningDialog";

const renderDialog = (props = {}) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <ForwardOnlyModeWarningDialog intl={{}} open onCancel={vi.fn()} onConfirm={vi.fn()} {...props} />
    </IntlProvider>,
  );

describe("ForwardOnlyModeWarningDialog", () => {
  it("requires explicit confirmation before invoking the save callback", () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    expect(screen.getByText("ledger.deployment.forwardOnly.message")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("ledger.deployment.forwardOnly.confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both choices while saving", () => {
    renderDialog({ submitting: true });

    expect(screen.getByText("ledger.deployment.forwardOnly.cancel")).toBeDisabled();
    expect(screen.getByText("ledger.deployment.forwardOnly.confirm")).toBeDisabled();
  });
});
