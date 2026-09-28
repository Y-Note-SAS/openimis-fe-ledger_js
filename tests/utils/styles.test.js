import { describe, expect, it } from "vitest";
import { ledgerDialogTitleStyles, ledgerSearcherStyles } from "../../src/utils/styles";

const theme = {
  spacing: (value) => `${value * 8}px`,
  paper: { item: { padding: "4px" }, header: { backgroundColor: "#B7D4D8", color: "#006273" } },
  palette: {
    primary: { main: "#006273", light: "#B7D4D8" },
    common: { white: "#FFFFFF" },
  },
};

describe("ledger styles helpers", () => {
  it("renders the header title cell as a full-width flex row holding the action", () => {
    const styles = ledgerSearcherStyles(theme);

    expect(styles["& .paper .tableContainer .paperHeader .infoSection"].width).toBe("100%");
    const typography = styles["& .paper .tableContainer .paperHeader .infoSection > .MuiTypography-root"];
    expect(typography.display).toBe("flex");
    expect(typography.alignItems).toBe("center");
    expect(typography.width).toBe("100%");
  });

  it("pushes the action to the right end of the header row", () => {
    const styles = ledgerSearcherStyles(theme);

    expect(styles["& .tableTitleSpacer"].flexGrow).toBe(1);
    expect(styles["& .tableTitleAction"].whiteSpace).toBe("nowrap");
  });

  it("paints the dialog header with the primary color and a white title", () => {
    // Applied on the DialogTitle itself (dialogs render in a portal).
    const title = ledgerDialogTitleStyles(theme);

    expect(title.backgroundColor).toBe(theme.palette.primary.main);
    expect(title.color).toBe(theme.palette.common.white);
    expect(title["& .MuiIconButton-root"].color).toBe("inherit");
  });
});
