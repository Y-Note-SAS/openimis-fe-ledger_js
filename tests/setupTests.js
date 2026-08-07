import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { vi } from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("@mui/material/styles", () => ({
  styled: (Component) => (styles) => {
    if (typeof styles === "function") {
      styles({
        theme: {
          spacing: (...values) => values.join(" "),
          palette: { primary: { main: "#006273", light: "#b7d4d8" } },
          shadows: [],
        },
      });
    }
    return Component;
  },
}));

vi.mock("@mui/material", () => ({
  Typography: ({ children }) => React.createElement("span", null, children),
  Chip: ({ label }) => React.createElement("span", null, label),
  Grid: ({ children }) => React.createElement("div", null, children),
  Autocomplete: ({
    options = [],
    value = null,
    inputValue = "",
    onInputChange,
    onChange,
    getOptionLabel = (option) => option?.label || "",
    renderInput,
    readOnly,
  }) =>
    React.createElement(
      "div",
      null,
      renderInput
        ? renderInput({
            inputProps: {
              value: inputValue,
              readOnly,
              onChange: (event) => onInputChange?.(event, event.target.value),
            },
          })
        : null,
      React.createElement(
        "select",
        {
          "aria-label": "autocomplete-options",
          value: value?.value ?? "",
          onChange: (event) => {
            const selected = options.find((option) => String(option?.value ?? "") === event.target.value) ?? null;
            onChange?.(event, selected);
          },
        },
        [
          React.createElement("option", { key: "__empty__", value: "" }, ""),
          ...options.map((option) =>
            React.createElement("option", { key: String(option?.value ?? ""), value: option?.value ?? "" }, getOptionLabel(option)),
          ),
        ],
      ),
    ),
  TextField: ({ label, inputProps = {}, ...props }) =>
    React.createElement("input", { "aria-label": label, ...inputProps, ...props }),
  Paper: ({ children }) => React.createElement("div", null, children),
  Box: ({ children }) => React.createElement("div", null, children),
  Alert: ({ children }) => React.createElement("div", null, children),
  Divider: () => React.createElement("div"),
  Table: ({ children }) => React.createElement("table", null, children),
  TableHead: ({ children }) => React.createElement("thead", null, children),
  TableBody: ({ children }) => React.createElement("tbody", null, children),
  TableRow: ({ children }) => React.createElement("tr", null, children),
  TableCell: ({ children }) => React.createElement("td", null, children),
}));
