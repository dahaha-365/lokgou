import type { FileChunk } from "./types";

const tokens = (text: string) => Math.ceil(text.length / 4);

export function chunkFile(
  path: string,
  text: string,
  linesPerChunk = 120,
  overlap = 15
): FileChunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: FileChunk[] = [];
  for (let start = 0; start < lines.length; start += linesPerChunk - overlap) {
    const end = Math.min(start + linesPerChunk, lines.length);
    const value = lines.slice(start, end).join("\n");
    chunks.push({
      id: `${path}:${start + 1}-${end}`,
      path,
      startLine: start + 1,
      endLine: end,
      text: value,
      estimatedTokens: tokens(value),
    });
    if (end === lines.length) break;
  }
  return chunks;
}
