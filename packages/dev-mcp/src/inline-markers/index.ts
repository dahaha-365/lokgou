import { rgPath } from "@vscode/ripgrep";

export const INLINE_MARKERS = [
  "IMPORTANT:",
  "CONTEXT:",
  "TODO(ai):",
  "WARNING:",
  "@deprecated",
] as const;
export type InlineMarker = (typeof INLINE_MARKERS)[number];

export type InlineMarkerMatch = {
  path: string;
  line: number;
  marker: InlineMarker;
  text: string;
  raw: string;
};

const ignored = /(^|\/)(?:node_modules|\.git|\.ai\/cache|src\/generated)(?:\/|$)/;
const markerPattern =
  /^\s*(?:\/\/|#|\/\*+|\*)\s*(IMPORTANT:|CONTEXT:|TODO\(ai\):|WARNING:|@deprecated)\s*(.*?)\s*(?:\*\/\s*)?$/;

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function allowed(path: string, paths: string[]): boolean {
  const normalized = normalizePath(path);
  return (
    !ignored.test(normalized) &&
    (!paths.length ||
      paths.some((root) => {
        const normalizedRoot = normalizePath(root).replace(/\/$/, "");
        return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
      }))
  );
}

export async function scanInlineMarkers(
  paths: string[] = [],
  markers: string[] = [...INLINE_MARKERS],
  limit = 100,
  root = process.cwd()
): Promise<InlineMarkerMatch[]> {
  const wanted = new Set(markers);
  const process = Bun.spawn([rgPath, "--files", "--hidden", root], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const output = await new Response(process.stdout).text();
  await process.exited;
  const matches: InlineMarkerMatch[] = [];
  const normalizedRoot = normalizePath(root).replace(/\/$/, "");

  for (const file of output.split(/\r?\n/).filter(Boolean)) {
    const absolute = file.trim();
    const normalizedAbsolute = normalizePath(absolute);
    const relative = normalizedAbsolute.startsWith(`${normalizedRoot}/`)
      ? normalizedAbsolute.slice(normalizedRoot.length + 1)
      : normalizedAbsolute;
    if (!allowed(relative, paths)) continue;
    let content: string;
    try {
      content = await Bun.file(absolute).text();
    } catch {
      continue;
    }
    content.split(/\r?\n/).forEach((raw, index) => {
      const found = markerPattern.exec(raw);
      if (!found || !found[1] || !wanted.has(found[1])) return;
      matches.push({
        path: relative,
        line: index + 1,
        marker: found[1] as InlineMarker,
        text: found[2] ?? "",
        raw,
      });
    });
  }

  return matches
    .sort(
      (a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.marker.localeCompare(b.marker)
    )
    .slice(0, limit);
}
