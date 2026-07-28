import { describe, expect, it } from "vitest";
import { RIGHT_LEDGER_REPORTING, RIGHT_LEDGER_ADMIN } from "../src/constants";

describe("ledger right constants", () => {
  it("are numbers", () => {
    expect(typeof RIGHT_LEDGER_REPORTING).toBe("number");
    expect(typeof RIGHT_LEDGER_ADMIN).toBe("number");
  });

  it("are distinct from each other", () => {
    expect(RIGHT_LEDGER_REPORTING).not.toBe(RIGHT_LEDGER_ADMIN);
  });
});
