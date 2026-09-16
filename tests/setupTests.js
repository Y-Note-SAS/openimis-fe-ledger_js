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
  Button: ({
    children,
    onClick,
    disabled,
    type,
    component,
    href,
    download,
    className,
    startIcon,
    variant,
    color,
    size,
    ...props
  }) =>
    component === "a"
      ? React.createElement("a", { href, download, onClick, className, ...props }, children)
      : React.createElement(
          "button",
          { type: type ?? "button", onClick, disabled, className, ...props },
          startIcon ?? null,
          children,
        ),
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
  IconButton: ({ children, onClick, disabled, "aria-label": ariaLabel, size, href, ...props }) =>
    React.createElement(
      href ? "a" : "button",
      { type: href ? undefined : "button", href, onClick, disabled, "aria-label": ariaLabel, ...props },
      children,
    ),
  Tooltip: ({ children, title }) => React.createElement("span", { "data-tooltip": title }, children),
  Checkbox: ({ checked, onChange, inputProps = {} }) =>
    React.createElement("input", {
      type: "checkbox",
      checked: !!checked,
      "aria-label": inputProps["aria-label"],
      onChange: (event) => onChange?.(event, event.target.checked),
    }),
  FormControlLabel: ({ control, label }) =>
    React.createElement("label", null, control, React.createElement("span", null, label)),

  Grid: ({ children }) => React.createElement("div", null, children),
  Autocomplete: ({
    options = [],
    value = null,
    inputValue = "",
    onInputChange,
    onChange,
    getOptionLabel = (option) => (typeof option === "string" ? option : option?.label || ""),
    renderInput,
    readOnly,
    disabled = false,
    multiple = false,
  }) => {
    const optionValue = (option) => {
      if (option === null || option === undefined) return "";
      if (typeof option !== "object") return String(option);
      return String(option.value ?? option.uuid ?? option.code ?? option.id ?? "");
    };
    return React.createElement(
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
          "aria-label": multiple ? "autocomplete-options-multiple" : "autocomplete-options",
          disabled,
          multiple,
          value: multiple ? (Array.isArray(value) ? value : []).map((entry) => optionValue(entry)) : optionValue(value),
          onChange: (event) => {
            // A native multiple select exposes every selected value through
            // `selectedOptions`; fall back to the single value otherwise.
            const rawValues = event.target.selectedOptions
              ? Array.from(event.target.selectedOptions).map((option) => option.value)
              : [event.target.value];
            const resolve = (value) =>
              options.find((option) => optionValue(option) === value) ?? (value ? value : null);
            if (multiple) {
              onChange?.(event, rawValues.filter(Boolean).map(resolve));
              return;
            }
            onChange?.(event, resolve(event.target.value));
          },
        },
        [
          React.createElement("option", { key: "__empty__", value: "" }, ""),
          ...options.map((option, index) =>
            React.createElement(
              "option",
              {
                key: optionValue(option) || `option-${index}`,
                value: optionValue(option),
              },
              getOptionLabel(option),
            ),
          ),
        ],
      ),
    );
  },
  TextField: ({ label, inputProps = {}, select, children, fullWidth, multiline, minRows, margin, ...props }) =>
    select
      ? React.createElement("select", { "aria-label": label, ...inputProps, ...props }, children)
      : React.createElement("input", { "aria-label": label, ...inputProps, ...props }),
  Stack: ({
    children,
    role,
    "aria-live": ariaLive,
    spacing,
    direction,
    alignItems,
    justifyContent,
    divider,
    useFlexGap,
    flexWrap,
    ...props
  }) => React.createElement("div", { role, "aria-live": ariaLive, ...props }, children),
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
  DialogTitle: ({ children, ...props }) => React.createElement("h2", props, children),
  DialogContent: ({ children }) => React.createElement("div", null, children),
  DialogActions: ({ children }) => React.createElement("div", null, children),
  FormControl: ({ children }) => React.createElement("div", null, children),
  InputLabel: ({ children }) => React.createElement("label", null, children),
}));
