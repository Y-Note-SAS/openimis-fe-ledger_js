import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import AccountingPeriodStatusBadge from "../../src/components/AccountingPeriodStatusBadge";
import { ACCOUNTING_PERIOD_STATUS } from "../../src/constants";

const renderBadge = (status) =>
  render(
    <IntlProvider locale="en" messages={{}}>
      <AccountingPeriodStatusBadge status={status} />
    </IntlProvider>,
  );

describe("AccountingPeriodStatusBadge", () => {
  it("renders the open status label", () => {
    renderBadge(ACCOUNTING_PERIOD_STATUS.OPEN);
    expect(screen.getByText("ledger.periods.status.open")).toBeInTheDocument();
  });

  it("renders the locked status label", () => {
    renderBadge(ACCOUNTING_PERIOD_STATUS.LOCKED);
    expect(screen.getByText("ledger.periods.status.locked")).toBeInTheDocument();
  });

  it("renders the closed status label", () => {
    renderBadge(ACCOUNTING_PERIOD_STATUS.CLOSED);
    expect(screen.getByText("ledger.periods.status.closed")).toBeInTheDocument();
  });
});
