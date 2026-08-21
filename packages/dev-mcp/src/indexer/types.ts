export type FileChunk = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  estimatedTokens: number;
};

export type SearchHit = {
  path: string;
  line: number;
  text: string;
  score: number;
  kind: "symbol" | "text";
};

export type SearchResult = {
  hits: SearchHit[];
  chunks: FileChunk[];
  estimatedTokens: number;
  truncated: boolean;
};
