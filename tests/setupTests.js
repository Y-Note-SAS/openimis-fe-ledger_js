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
  Button: ({ children, onClick, disabled, type, component, href, download }) =>
    component === "a"
      ? React.createElement("a", { href, download, onClick }, children)
      : React.createElement("button", { type: type ?? "button", onClick, disabled }, children),
  MenuItem: ({ value, children }) => React.createElement("option", { value: value ?? "" }, children),
  Select: ({ value, children, onChange, inputProps = {} }) => {
    const options = React.Children.toArray(children);
    return React.createElement(
      "select",
      {
        "aria-label": inputProps?.["aria-label"],
        value: value ?? "",
        onChange: (event) => onChange?.({ target: { value: event.target.value } }),
      },
      options.map((option) =>
        React.createElement(
          "option",
          { key: String(option?.props?.value ?? ""), value: option?.props?.value ?? "" },
          option?.props?.children,
        ),
      ),
    );
  },
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
          ...options.map((option, index) =>
            React.createElement(
              "option",
              {
                key: String(option?.value ?? option?.analyticValueId ?? option?.id ?? index),
                value: option?.value ?? "",
              },
              getOptionLabel(option),
            ),
          ),
        ],
      ),
    ),
  TextField: ({ label, inputProps = {}, select, children, fullWidth, multiline, minRows, margin, ...props }) =>
    select
      ? React.createElement("select", { "aria-label": label, ...inputProps, ...props }, children)
      : React.createElement("input", { "aria-label": label, ...inputProps, ...props }),
  Stack: ({ children, role, "aria-live": ariaLive, spacing, direction, alignItems, justifyContent, divider, useFlexGap, flexWrap, ...props }) =>
    React.createElement("div", { role, "aria-live": ariaLive, ...props }, children),
  Paper: ({ children }) => React.createElement("div", null, children),
  Box: ({ children }) => React.createElement("div", null, children),
  Alert: ({ children }) => React.createElement("div", null, children),
  Divider: () => React.createElement("div"),
  Table: ({ children }) => React.createElement("table", null, children),
  TableHead: ({ children }) => React.createElement("thead", null, children),
  TableBody: ({ children }) => React.createElement("tbody", null, children),
  TableRow: ({ children }) => React.createElement("tr", null, children),
  TableCell: ({ children }) => React.createElement("td", null, children),
  Dialog: ({ children, open }) => (open ? React.createElement("div", { role: "dialog" }, children) : null),
  DialogTitle: ({ children }) => React.createElement("h2", null, children),
  DialogContent: ({ children }) => React.createElement("div", null, children),
  DialogActions: ({ children }) => React.createElement("div", null, children),
  FormControl: ({ children }) => React.createElement("div", null, children),
  InputLabel: ({ children }) => React.createElement("label", null, children),
}));
