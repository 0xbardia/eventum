import assert from "node:assert/strict";
import { test } from "node:test";
import { shortHash, shortText } from "../../src/lib/format";

test("result formatting keeps identifiers recognizable and text bounded", () => {
  const hash = "a".repeat(64);
  assert.equal(shortHash(hash, 6), "aaaaaa…aaaaaa");
  assert.equal(shortText("a".repeat(20), 10), "aaaaaaaaa…");
  assert.equal(shortText("short", 10), "short");
});
