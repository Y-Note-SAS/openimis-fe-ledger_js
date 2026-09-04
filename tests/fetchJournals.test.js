import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@openimis/fe-core", () => ({
  graphqlWithVariables: vi.fn((...args) => ({ graphqlWithVariables: args })),
  formatServerError: (error) => error,
  formatGraphQLError: (payload) => payload?.errors || null,
  decodeId: (id) => id,
}));

import { graphqlWithVariables } from "@openimis/fe-core";
import { fetchJournals } from "../src/actions";

describe("fetchJournals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries every journal when no type is given", () => {
    fetchJournals();
    expect(graphqlWithVariables).toHaveBeenCalledTimes(1);
    const [operation, variables, types, meta] = graphqlWithVariables.mock.calls[0];
    expect(operation).toContain("query Journals");
    expect(operation).toContain("ledgerJournal");
    expect(operation).not.toContain("$type");
    expect(operation).not.toContain("orderBy");
    expect(variables).toEqual({ first: 100 });
    expect(types).toEqual(["LEDGER_JOURNAL_SEARCH_REQ", "LEDGER_JOURNAL_SEARCH_RESP", "LEDGER_JOURNAL_SEARCH_ERR"]);
    expect(meta).toEqual({ journalType: null });
  });

  it("queries only journals of the requested type when a type is given", () => {
    fetchJournals("TRESORERIE");
    const [operation, variables, , meta] = graphqlWithVariables.mock.calls[0];
    expect(operation).toContain("query JournalsByType");
    expect(operation).toContain("ledgerJournal");
    expect(operation).toContain("type: $type");
    expect(operation).not.toContain("orderBy");
    expect(variables).toEqual({ first: 100, type: "TRESORERIE" });
    expect(meta).toEqual({ journalType: "TRESORERIE" });
  });
});
