/**
 * openIMIS charté helpers shared by the ledger management screens.
 */

/**
 * List screens: the "New …" action is rendered **inside** the panel header row
 * (through the Searcher `tableTitle` node) instead of being overlaid from
 * outside. The header row is a flex row with `alignItems: center`, so the
 * button is vertically centred by the band itself — no imposed height, no
 * absolute positioning.
 */
export const ledgerSearcherStyles = (theme) => ({
  // The title cell holds both the label and the action: make it a full-width
  // flex row (fe-core renders the title inside a nowrap Typography).
  "& .paper .tableContainer .paperHeader .infoSection": {
    width: "100%",
  },
  "& .paper .tableContainer .paperHeader .infoSection > .MuiTypography-root": {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing?.(1) ?? "8px",
    width: "100%",
    overflow: "visible",
  },
  // Pushes the action to the right end of the header row.
  "& .tableTitleSpacer": {
    flexGrow: 1,
  },
  "& .tableTitleAction": {
    whiteSpace: "nowrap",
  },
});

/**
 * Dialog header: openIMIS primary band with a white title and white icons.
 *
 * Applied **directly on the `DialogTitle` element**: MUI renders dialogs in a
 * portal, so a style wrapper around `<Dialog>` never matches its content.
 */
export const ledgerDialogTitleStyles = (theme) => ({
  backgroundColor: theme.palette?.primary?.main,
  color: theme.palette?.common?.white ?? "#fff",
  "& .MuiIconButton-root": {
    color: "inherit",
  },
});
