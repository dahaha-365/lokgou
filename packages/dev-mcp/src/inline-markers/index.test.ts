import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanInlineMarkers } from "./index";

test("scans all markers and supported comment prefixes in stable order", async () => {
  const root = await mkdtemp(join(tmpdir(), "dev-mcp-markers-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(
    join(root, "src", "b.ts"),
    "# CONTEXT: context\n/* WARNING: warning */\n* @deprecated old\n"
  );
  await writeFile(join(root, "a.ts"), "// IMPORTANT: important\n// TODO(ai): todo\n");
  try {
    const result = await scanInlineMarkers([], undefined, 100, root);
    expect(result.map(({ path, line, marker, text }) => ({ path, line, marker, text }))).toEqual([
      { path: "a.ts", line: 1, marker: "IMPORTANT:", text: "important" },
      { path: "a.ts", line: 2, marker: "TODO(ai):", text: "todo" },
      { path: "src/b.ts", line: 1, marker: "CONTEXT:", text: "context" },
      { path: "src/b.ts", line: 2, marker: "WARNING:", text: "warning" },
      { path: "src/b.ts", line: 3, marker: "@deprecated", text: "old" },
    ]);
    expect(result[0]?.raw).toBe("// IMPORTANT: important");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("filters paths and markers and applies limit", async () => {
  const root = await mkdtemp(join(tmpdir(), "dev-mcp-markers-"));
  await mkdir(join(root, "skip", "node_modules"), { recursive: true });
  await writeFile(join(root, "keep.ts"), "// WARNING: one\n// IMPORTANT: two\n");
  await writeFile(join(root, "skip", "node_modules", "ignored.ts"), "// WARNING: ignored\n");
  try {
    const result = await scanInlineMarkers(["keep.ts"], ["WARNING:"], 1, root);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("one");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
