import { describe, expect, it } from "vitest";
import { graphqlString } from "../../src/utils/graphqlLiteral";

describe("graphqlString", () => {
  it("wraps a plain value in a GraphQL string literal", () => {
    expect(graphqlString("1200")).toBe('"1200"');
  });

  it("escapes the characters that would break the operation document", () => {
    // A journal named `Sales "comoros"` used to close the filter literal early.
    expect(graphqlString('Sales "comoros"')).toBe('"Sales \\"comoros\\""');
    expect(graphqlString("back\\slash")).toBe('"back\\\\slash"');
    expect(graphqlString("line\nbreak")).toBe('"line\\nbreak"');
    expect(graphqlString("tab\there")).toBe('"tab\\there"');
    expect(graphqlString("ctrl\u0007char")).toBe('"ctrl\\u0007char"');
  });

  it("renders null and undefined as an empty string", () => {
    expect(graphqlString(null)).toBe('""');
    expect(graphqlString(undefined)).toBe('""');
  });
});
