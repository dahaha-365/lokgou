import { expect, test } from "bun:test";
import { chunkFile } from "./chunker";

test("chunkFile creates overlapping line chunks", () => {
  const chunks = chunkFile(
    "file.ts",
    Array.from({ length: 200 }, (_, i) => `${i + 1}`).join("\n"),
    100,
    10
  );
  expect(chunks.length).toBe(3);
  expect(chunks[1]?.startLine).toBe(91);
});
