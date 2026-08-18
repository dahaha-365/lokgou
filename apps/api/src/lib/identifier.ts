export type IdentifierOptions = {
  prefix: string;
  middle?: string;
  counter: number;
  length: number;
};

export function createIdentifier({ prefix, middle, counter, length }: IdentifierOptions): string {
  if (!prefix.trim()) throw new Error("Identifier prefix is required.");
  if (!Number.isInteger(counter) || counter < 1)
    throw new Error("Identifier counter must be positive.");
  if (!Number.isInteger(length) || length < 1)
    throw new Error("Identifier length must be positive.");

  const parts = [prefix.trim(), middle?.trim(), String(counter).padStart(length, "0")].filter(
    Boolean
  );
  return parts.join("");
}

export function resolveIdentifierMiddle(template: string, date = new Date()): string {
  const values: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    DD: String(date.getDate()).padStart(2, "0"),
  };

  return template.replace(/\{(YYYY|YY|MM|DD)\}/g, (_, token: string) => values[token]!);
}
