import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { DeploymentConfigurationPage } from "../../src/pages/DeploymentConfigurationPage";
import { ACCOUNT_TYPE, RIGHT_LEDGER_ADMIN } from "../../src/constants";

vi.mock("../../src/pickers/AccountPicker", () => ({
  default: ({ label, onChange, value, excludeTypes = [] }) => (
    <div>
      <span>{label}</span>
      <span data-testid="account-picker-value">{value?.uuid || ""}</span>
      <span data-testid="account-picker-excluded-types">{excludeTypes.join(",")}</span>
      <button
        type="button"
        onClick={() =>
          onChange?.({ id: "AccountType:uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves", type: "EQ" })
        }
      >
        select-retained-earnings
      </button>
    </div>
  ),
}));

const configuration = (overrides = {}) => ({
  data: {
    operatingMode: "local_only",
    externalSystem: null,
    currencyCode: "XAF",
    retainedEarningsAccount: { id: "uuid-1", uuid: "uuid-1", code: "1200", name: "Reserves" },
    ...overrides,
  },
  isFetching: false,
  isFetched: true,
  submitting: false,
  error: null,
});

const renderPage = (props = {}) => {
  const pageProps = {
    intl: {},
    rights: [RIGHT_LEDGER_ADMIN],
    deploymentConfiguration: { data: null, submitting: false, error: null, isFetching: false, isFetched: false },
    accountOptions: { items: [], isFetching: false, isFetched: true },
    fetchLedgerDeploymentConfiguration: vi.fn(),
    createDeploymentConfiguration: vi.fn(),
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
    expect(screen.getByText("ledger.deployment.retainedEarningsAccount")).toBeInTheDocument();
  });

  it("denies access without the finance administrator right and skips the configuration fetch", () => {
    const fetchLedgerDeploymentConfiguration = vi.fn();
    renderPage({ rights: [], fetchLedgerDeploymentConfiguration });

    expect(screen.getByText("ledger.accessDenied")).toBeInTheDocument();
    expect(fetchLedgerDeploymentConfiguration).not.toHaveBeenCalled();
  });

  it("loads the current configuration on mount", () => {
    const fetchLedgerDeploymentConfiguration = vi.fn();
    renderPage({ fetchLedgerDeploymentConfiguration });

    expect(fetchLedgerDeploymentConfiguration).toHaveBeenCalledTimes(1);
  });

  it("hides income and expense accounts from the retained earnings picker", () => {
    renderPage();

    expect(screen.getByTestId("account-picker-excluded-types")).toHaveTextContent(
      `${ACCOUNT_TYPE.INCOME},${ACCOUNT_TYPE.EXPENSE}`,
    );
  });

  it("keeps the save button disabled until a retained earnings account is selected", () => {
    const createDeploymentConfiguration = vi.fn();
    renderPage({
      deploymentConfiguration: configuration({ retainedEarningsAccount: null }),
      createDeploymentConfiguration,
    });

    const saveButton = screen.getByRole("button", { name: "ledger.deployment.save" });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "select-retained-earnings" }));
    expect(screen.getByTestId("account-picker-value")).toHaveTextContent("uuid-1");
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    expect(createDeploymentConfiguration).toHaveBeenCalledWith({
      operatingMode: "local_only",
      externalSystem: null,
      currencyCode: "XAF",
      retainedEarningsAccount: expect.objectContaining({ uuid: "uuid-1" }),
      clientMutationLabel: "ledger.deployment.save",
    });
  });

  it("requires an external system when the operating mode is replicated", async () => {
    const createDeploymentConfiguration = vi.fn();
    renderPage({
      deploymentConfiguration: configuration({ operatingMode: "replicated", externalSystem: null }),
      createDeploymentConfiguration,
    });

    const saveButton = screen.getByRole("button", { name: "ledger.deployment.save" });
    expect(saveButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("ledger.deployment.externalSystem"), "odoo");

    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    expect(createDeploymentConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ operatingMode: "replicated", externalSystem: "odoo" }),
    );
  });

  it("shows the deployment error message when provided", () => {
    renderPage({ deploymentConfiguration: { data: null, submitting: false, error: "Network error" } });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
