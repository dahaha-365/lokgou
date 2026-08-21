import { stat } from "node:fs/promises";
import type { FileChunk } from "./types";
import { chunkFile } from "./chunker";

type Entry = { mtimeMs: number; size: number; chunks: FileChunk[] };
const cache = new Map<string, Entry>();

export async function cachedChunks(path: string): Promise<FileChunk[]> {
  const metadata = await stat(path);
  const previous = cache.get(path);
  if (previous?.mtimeMs === metadata.mtimeMs && previous.size === metadata.size)
    return previous.chunks;
  const chunks = chunkFile(path, await Bun.file(path).text());
  cache.set(path, { mtimeMs: metadata.mtimeMs, size: metadata.size, chunks });
  return chunks;
}

export function clearIndexCache(): void {
  cache.clear();
}
