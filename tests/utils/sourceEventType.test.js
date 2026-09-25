import { describe, expect, it } from "vitest";
import { sourceEventTypeEnumName } from "../../src/utils/sourceEventType";

describe("sourceEventTypeEnumName", () => {
  it("returns the GraphQL enum name used by ledgerEntries", () => {
    // The stored value is lower-case; the schema only accepts the enum NAME.
    expect(sourceEventTypeEnumName("claim_payment")).toBe("CLAIM_PAYMENT");
    expect(sourceEventTypeEnumName("payment_point_reconciliation")).toBe("PAYMENT_POINT_RECONCILIATION");
  });

  it("returns null for an empty value", () => {
    expect(sourceEventTypeEnumName(null)).toBe(null);
    expect(sourceEventTypeEnumName("")).toBe(null);
  });
});
