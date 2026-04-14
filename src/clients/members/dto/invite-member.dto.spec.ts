import { inviteMemberSchema } from './invite-member.dto';

const cuid1 = 'abc1234567890123456789ab';
const cuid2 = 'def1234567890123456789ab';
const cuid3 = 'ghi1234567890123456789ab';
const cuid4 = 'jkl1234567890123456789ab';

describe('inviteMemberSchema', () => {
  it('parses legacy single-assignment payload as kind: single', () => {
    const result = inviteMemberSchema.parse({
      email: 'User@Example.com',
      roleId: cuid1,
      siteId: cuid2,
    });
    expect(result.kind).toBe('single');
    expect(result.email).toBe('user@example.com');
    expect(result.assignments).toEqual([{ roleId: cuid1, siteId: cuid2 }]);
  });

  it('parses multi-assignment payload as kind: multi', () => {
    const result = inviteMemberSchema.parse({
      email: 'user@example.com',
      assignments: [
        { roleId: cuid1, siteId: cuid2 },
        { roleId: cuid3, siteId: cuid4 },
      ],
    });
    expect(result.kind).toBe('multi');
    expect(result.assignments).toHaveLength(2);
  });

  it('rejects payloads that mix legacy fields with assignments (strict mode)', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      roleId: cuid1,
      siteId: cuid2,
      assignments: [{ roleId: cuid3, siteId: cuid4 }],
    });
    // Both shapes are .strict(): legacy rejects unknown `assignments`, multi
    // rejects unknown `roleId`/`siteId`. Neither branch matches → union fails.
    expect(result.success).toBe(false);
  });

  it('rejects duplicate assignments within multi payload', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      assignments: [
        { roleId: cuid1, siteId: cuid2 },
        { roleId: cuid1, siteId: cuid2 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
