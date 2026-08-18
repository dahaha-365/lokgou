/** Serialize Prisma DateTime values to RFC 3339 / ISO 8601 strings for JSON APIs. */
type SerializedDates<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export function serializeDates<T extends Record<string, unknown>>(value: T): SerializedDates<T> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item instanceof Date ? item.toISOString() : item,
    ])
  ) as SerializedDates<T>;
}

/** Serialize Prisma DateTime values to RFC 3339 / ISO 8601 strings for JSON APIs. */
export function serializeDatesArray<T extends Record<string, unknown>>(
  values: T[]
): SerializedDates<T>[] {
  return values.map(serializeDates);
}
