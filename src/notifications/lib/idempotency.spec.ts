import { buildIdempotencyKey, getUtcDateBucket } from './idempotency';

describe('buildIdempotencyKey', () => {
  it('joins string parts with colons', () => {
    expect(buildIdempotencyKey('alert', 'abc-123')).toBe('alert:abc-123');
  });

  it('converts numbers to strings', () => {
    expect(buildIdempotencyKey('retry', 3)).toBe('retry:3');
  });

  it('converts Date objects to ISO strings', () => {
    const date = new Date('2026-03-18T12:00:00.000Z');
    expect(buildIdempotencyKey('job', date)).toBe(
      'job:2026-03-18T12:00:00.000Z',
    );
  });

  it('filters out null and undefined parts', () => {
    expect(buildIdempotencyKey('a', null, 'b', undefined, 'c')).toBe('a:b:c');
  });

  it('filters out empty and whitespace-only strings', () => {
    expect(buildIdempotencyKey('a', '', '  ', 'b')).toBe('a:b');
  });

  it('trims whitespace from string parts', () => {
    expect(buildIdempotencyKey('  alert ', ' id ')).toBe('alert:id');
  });

  it('returns empty string when all parts are filtered out', () => {
    expect(buildIdempotencyKey(null, undefined, '', '  ')).toBe('');
  });
});

describe('getUtcDateBucket', () => {
  const date = new Date('2026-03-18T23:59:59.999Z');

  it('returns yyyy-mm-dd for day granularity', () => {
    expect(getUtcDateBucket(date, 'day')).toBe('2026-03-18');
  });

  it('returns yyyy-mm for month granularity', () => {
    expect(getUtcDateBucket(date, 'month')).toBe('2026-03');
  });

  it('uses UTC regardless of local timezone', () => {
    const midnight = new Date('2026-01-01T00:00:00.000Z');
    expect(getUtcDateBucket(midnight, 'day')).toBe('2026-01-01');
    expect(getUtcDateBucket(midnight, 'month')).toBe('2026-01');
  });
});
