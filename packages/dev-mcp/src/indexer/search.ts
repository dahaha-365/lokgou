import { rgPath } from "@vscode/ripgrep";
import type { FileChunk, SearchHit, SearchResult } from "./types";
import { cachedChunks } from "./cache";

const ignored = ["node_modules", ".git", ".ai/cache", "src/generated"];
const symbolPattern = /(?:export\s+)?(?:const|function|class|interface|type)\s+([A-Za-z_$][\w$]*)/;

function termsOf(query: string): string[] {
  return [...new Set(query.split(/[^\p{L}\p{N}_$-]+/u).filter((term) => term.length > 1))];
}

function allowed(path: string, paths: string[]) {
  return (
    !ignored.some((part) => path.includes(part)) &&
    (!paths.length || paths.some((root) => path === root || path.startsWith(`${root}/`)))
  );
}

export async function searchLocal(
  query: string,
  paths: string[] = [],
  limit = 20
): Promise<SearchResult> {
  const terms = termsOf(query);
  const args = ["--json", "--line-number", "--no-heading", "--hidden", terms.join("|"), "."];
  const process = Bun.spawn([rgPath, ...args], { stdout: "pipe", stderr: "ignore" });
  const output = await new Response(process.stdout).text();
  await process.exited;
  const hits: SearchHit[] = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    try {
      const event = JSON.parse(line) as {
        type: string;
        data?: { path?: { text: string }; line_number?: number; lines?: { text: string } };
      };
      if (event.type !== "match" || !event.data?.path?.text || !event.data.line_number) continue;
      const path = event.data.path.text.replaceAll("\\", "/");
      if (!allowed(path, paths)) continue;
      const text = event.data.lines?.text?.trimEnd() ?? "";
      const symbol = symbolPattern.exec(text)?.[1];
      hits.push({
        path,
        line: event.data.line_number,
        text,
        score: symbol ? 10 : 3,
        kind: symbol ? "symbol" : "text",
      });
    } catch {
      /* ignore malformed rg events */
    }
  }
  const selected = hits.sort((a, b) => b.score - a.score).slice(0, limit);
  const grouped = new Map<string, FileChunk[]>();
  for (const hit of selected) {
    grouped.set(
      hit.path,
      (await cachedChunks(hit.path)).filter(
        (chunk) => hit.line >= chunk.startLine && hit.line <= chunk.endLine
      )
    );
  }
  const chunks = [...grouped.values()].flat();
  return {
    hits: selected,
    chunks,
    estimatedTokens: chunks.reduce((sum, chunk) => sum + chunk.estimatedTokens, 0),
    truncated: hits.length > selected.length,
  };
}
