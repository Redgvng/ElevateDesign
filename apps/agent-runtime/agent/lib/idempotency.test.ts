import { describe, expect, it } from "vitest";
import { idempotencyKey } from "./idempotency";

const base = { sessionId: "s1", turnId: "t1", jobId: "j1", baseVersionId: "v1" };

describe("idempotencyKey", () => {
  it("is deterministic for identical operation and context", () => {
    expect(idempotencyKey("create_screen_version", base)).toBe(
      idempotencyKey("create_screen_version", base),
    );
  });

  it("changes when any component changes", () => {
    const key = idempotencyKey("create_screen_version", base);
    expect(idempotencyKey("create_variants", base)).not.toBe(key);
    expect(idempotencyKey("create_screen_version", { ...base, turnId: "t2" })).not.toBe(key);
    expect(idempotencyKey("create_screen_version", { ...base, baseVersionId: "v2" })).not.toBe(key);
  });

  it("treats missing optional fields as stable empties", () => {
    expect(idempotencyKey("op", { sessionId: "s", turnId: "t" })).toBe(
      idempotencyKey("op", { sessionId: "s", turnId: "t", jobId: null, baseVersionId: null }),
    );
  });

  it("rejects missing required identifiers", () => {
    expect(() => idempotencyKey("", base)).toThrow();
    expect(() => idempotencyKey("op", { sessionId: "", turnId: "t" })).toThrow();
    expect(() => idempotencyKey("op", { sessionId: "s", turnId: "" })).toThrow();
  });

  it("prefixes the key with the operation for readability", () => {
    expect(idempotencyKey("create_variants", base)).toMatch(/^eve_create_variants_[0-9a-f]{32}$/);
  });
});
