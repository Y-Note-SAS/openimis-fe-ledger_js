import { describe, expect, it } from "vitest";
import { collectCurrencyCodes, formatCurrenciesGQLValue, parseCurrencies } from "../../src/utils/currencies";

describe("currencies utils", () => {
  it("keeps an array of codes as-is", () => {
    expect(parseCurrencies(["XAF", "EUR"])).toEqual(["XAF", "EUR"]);
  });

  it("parses the backend JSONString form", () => {
    expect(parseCurrencies('["XAF","EUR"]')).toEqual(["XAF", "EUR"]);
  });

  it("returns an empty array for unusable values", () => {
    expect(parseCurrencies("XAF")).toEqual([]);
    expect(parseCurrencies(null)).toEqual([]);
    expect(parseCurrencies(undefined)).toEqual([]);
    expect(parseCurrencies('{"a":1}')).toEqual([]);
  });

  it("collects the distinct codes used by the accounts, sorted", () => {
    const accounts = [{ currencies: '["XAF","EUR"]' }, { currencies: ["EUR", "USD"] }, { currencies: [] }, null];

    expect(collectCurrencyCodes(accounts)).toEqual(["EUR", "USD", "XAF"]);
  });

  it("encodes the currencies as a GraphQL JSONString literal", () => {
    const literal = formatCurrenciesGQLValue(["XAF", "EUR"]);

    // The GraphQL literal is a string containing the JSON list, because the
    // backend JSONString scalar runs json.loads() on it.
    expect(literal).toBe('"[\\"XAF\\",\\"EUR\\"]"');
    expect(JSON.parse(literal)).toBe('["XAF","EUR"]');
    expect(JSON.parse(JSON.parse(literal))).toEqual(["XAF", "EUR"]);
  });

  it("drops empty entries when encoding", () => {
    expect(formatCurrenciesGQLValue(["XAF", "", null])).toBe('"[\\"XAF\\"]"');
  });
});
