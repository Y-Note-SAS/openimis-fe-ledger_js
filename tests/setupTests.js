import React from "react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@mui/material/styles", () => ({
  styled: () => (Component) => Component,
}));

vi.mock("@mui/material", () => ({
  Typography: ({ children }) => React.createElement("span", null, children),
  Autocomplete: ({ renderInput }) => React.createElement("div", null, renderInput ? renderInput({}) : null),
  TextField: ({ label }) => React.createElement("input", { "aria-label": label }),
}));
