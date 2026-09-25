import { describe, it, expect, vi } from "vitest";

// The real fe-core `formatGraphQLError` returns a generic `message`
// ("Server returned data error status") and puts the GraphQL messages in
// `detail`; the shared test double only returns `message`, so the double is
// overridden here to exercise both shapes.
const { formatGraphQLErrorSpy } = vi.hoisted(() => ({ formatGraphQLErrorSpy: vi.fn() }));

vi.mock("@openimis/fe-core", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, formatGraphQLError: formatGraphQLErrorSpy };
});

import { firstErrorMessage, graphqlErrorMessage } from "../../src/utils/graphqlErrors";

describe("firstErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(firstErrorMessage(null)).toBeNull();
    expect(firstErrorMessage(undefined)).toBeNull();
    expect(firstErrorMessage([])).toBeNull();
  });

  it("returns the first message of a mutation payload", () => {
    expect(firstErrorMessage([{ field: "startDate", message: "Overlapping period" }])).toBe("Overlapping period");
    expect(firstErrorMessage([{ message: "first" }, { message: "second" }])).toBe("first");
  });
});

describe("graphqlErrorMessage", () => {
  it("returns null when the query succeeded", () => {
    formatGraphQLErrorSpy.mockReturnValueOnce(null);
    expect(graphqlErrorMessage({ data: {} })).toBeNull();
  });

  it("prefers the detail, where fe-core stores the GraphQL messages", () => {
    formatGraphQLErrorSpy.mockReturnValueOnce({
      code: "Data error",
      message: "Server returned data error status",
      detail: "Field 'party' is not defined",
    });
    expect(graphqlErrorMessage({ errors: [{ message: "Field 'party' is not defined" }] })).toBe(
      "Field 'party' is not defined",
    );
  });

  it("falls back to the generic message when there is no detail", () => {
    formatGraphQLErrorSpy.mockReturnValueOnce({ code: "Data error", message: "Server returned data error status" });
    expect(graphqlErrorMessage({ errors: [{ message: "boom" }] })).toBe("Server returned data error status");
  });
});
