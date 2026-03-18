type IdempotencyKeyPart = string | number | Date | null | undefined;

/**
 * Builds a stable BullMQ job ID from logical key parts.
 * Parts are joined with `:` as the delimiter.
 *
 * Callers must ensure individual parts do not contain `:` — otherwise
 * `buildIdempotencyKey('foo:bar', 'baz')` and `buildIdempotencyKey('foo', 'bar:baz')`
 * would produce the same key. Current usage (UUIDs, fixed prefixes, ISO date slices)
 * satisfies this constraint.
 */
export function buildIdempotencyKey(...parts: IdempotencyKeyPart[]): string {
  return parts
    .filter((part): part is Exclude<IdempotencyKeyPart, null | undefined> => {
      return part !== null && part !== undefined;
    })
    .map((part) => {
      if (part instanceof Date) {
        return part.toISOString();
      }
      return String(part).trim();
    })
    .filter((part) => part.length > 0)
    .join(':');
}

/**
 * Creates a UTC date bucket for idempotency windows.
 */
export function getUtcDateBucket(date: Date, granularity: 'day' | 'month') {
  const iso = date.toISOString();
  return granularity === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}
