import { test } from "node:test";
import assert from "node:assert/strict";
import { safeJsonParse } from "./openai.js";

test("safeJsonParse handles plain JSON", () => {
  const out = safeJsonParse<{ a: number }>(`{"a": 1}`);
  assert.deepEqual(out, { a: 1 });
});

test("safeJsonParse strips ```json fences", () => {
  const out = safeJsonParse<{ ok: boolean }>("```json\n{\"ok\": true}\n```");
  assert.deepEqual(out, { ok: true });
});

test("safeJsonParse falls back to first {...} block", () => {
  const out = safeJsonParse<{ k: string }>("Here is the result: {\"k\":\"v\"} thanks!");
  assert.deepEqual(out, { k: "v" });
});

test("safeJsonParse returns null for invalid", () => {
  assert.equal(safeJsonParse("not json"), null);
});
