import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { DeploymentConfigurationPage } from "../../src/pages/DeploymentConfigurationPage";
import { RIGHT_LEDGER_ADMIN } from "../../src/constants";

const renderPage = (props = {}) => {
  const pageProps = {
    intl: {},
    rights: [RIGHT_LEDGER_ADMIN],
    deploymentConfiguration: { data: null, submitting: false, error: null },
    externalSystems: { items: [] },
    currencyCodes: { items: [] },
    chartOfAccounts: { items: [] },
    fetchLedgerDeploymentReferenceData: vi.fn(),
    configureDeployment: vi.fn(),
    ...props,
  };
  return render(
    <IntlProvider locale="en" messages={{}}>
      <DeploymentConfigurationPage {...pageProps} />
    </IntlProvider>,
  );
};

describe("DeploymentConfigurationPage", () => {
  it("renders the configuration form for finance administrators", () => {
    renderPage();

    expect(screen.getByLabelText("ledger.deployment.operatingMode")).toBeInTheDocument();
  });

  it("denies access without the finance administrator right and skips the reference data fetch", () => {
    const fetchLedgerDeploymentReferenceData = vi.fn();
    renderPage({ rights: [], fetchLedgerDeploymentReferenceData });

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(fetchLedgerDeploymentReferenceData).not.toHaveBeenCalled();
  });

  it("shows the deployment error message when provided", () => {
    renderPage({ deploymentConfiguration: { data: null, submitting: false, error: "Network error" } });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
