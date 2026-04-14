import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { ApiClsService } from 'src/auth/api-cls.service';
import { clearAccessGrantResponseCache } from 'src/auth/utils/access-grants';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { ApiConfigService } from '../../config/api-config.service';
import { SendEmailJobData } from '../../notifications/lib/templates';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationsDto } from './dto/create-invitation.dto';
import { QueryInvitationDto } from './dto/query-invitation.dto';
import { RenewInvitationDto } from './dto/renew-invitation.dto';

const invitationInclude = {
  client: { select: { id: true, name: true, externalId: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  acceptedBy: { select: { id: true, firstName: true, lastName: true } },
  role: { select: { id: true, name: true, scope: true } },
  site: { select: { id: true, name: true } },
} satisfies Prisma.InvitationInclude;

// Scopes at CLIENT or higher are client-wide — the site assignment is
// irrelevant for the invitee, so we hide it from the email.
const CLIENT_OR_GREATER_SCOPES = new Set(['CLIENT', 'GLOBAL', 'SYSTEM']);
const isClientOrGreater = (scope: string) =>
  CLIENT_OR_GREATER_SCOPES.has(scope);

type InvitationWithRelations = Prisma.InvitationGetPayload<{
  include: typeof invitationInclude;
}>;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    private readonly config: ApiConfigService,
    private readonly memoryCache: MemoryCacheService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Generate the invite URL from the code.
   */
  private getInviteUrl(code: string): string {
    const frontendUrl = this.config.get('FRONTEND_URL');
    return `${frontendUrl}/accept-invite/${code}`;
  }

  /**
   * Build email template props common to both single and grouped invitations.
   */
  private buildInvitationEmailBase(invitation: InvitationWithRelations) {
    return {
      templateName: 'invitation' as const,
      to: [invitation.email],
      templateProps: {
        clientName: invitation.client.name,
        inviterFirstName: invitation.createdBy.firstName,
        inviterLastName: invitation.createdBy.lastName,
        inviteeEmail: invitation.email,
        inviteUrl: this.getInviteUrl(invitation.code),
        expiresOn: invitation.expiresOn.toISOString(),
      },
    };
  }

  /**
   * Build email job data for a single (ungrouped) invitation.
   */
  private buildInvitationEmailData(invitation: InvitationWithRelations) {
    const base = this.buildInvitationEmailBase(invitation);
    return {
      ...base,
      templateProps: {
        ...base.templateProps,
        siteName: isClientOrGreater(invitation.role.scope)
          ? undefined
          : invitation.site.name,
        roleName: invitation.role.name,
      },
    };
  }

  /**
   * Build email job data for a grouped invitation (multiple role/site assignments).
   */
  private buildGroupedInvitationEmailData(
    invitations: InvitationWithRelations[],
  ) {
    if (invitations.length === 0) {
      throw new Error(
        'buildGroupedInvitationEmailData requires at least one invitation',
      );
    }
    const base = this.buildInvitationEmailBase(invitations[0]);
    return {
      ...base,
      templateProps: {
        ...base.templateProps,
        assignments: invitations.map((inv) => ({
          siteName: isClientOrGreater(inv.role.scope)
            ? undefined
            : inv.site.name,
          roleName: inv.role.name,
        })),
      },
    };
  }

  /**
   * Build email jobs for a set of invitations, grouping by groupId where applicable.
   */
  private buildInvitationEmails(
    invitations: InvitationWithRelations[],
  ): SendEmailJobData<'invitation'>[] {
    const grouped = new Map<string, InvitationWithRelations[]>();
    const ungrouped: InvitationWithRelations[] = [];

    for (const inv of invitations) {
      if (inv.groupId) {
        const group = grouped.get(inv.groupId) ?? [];
        group.push(inv);
        grouped.set(inv.groupId, group);
      } else {
        ungrouped.push(inv);
      }
    }

    const emails: SendEmailJobData<'invitation'>[] = ungrouped.map((inv) =>
      this.buildInvitationEmailData(inv),
    );
    for (const group of grouped.values()) {
      emails.push(this.buildGroupedInvitationEmailData(group));
    }

    return emails;
  }

  /**
   * Common include for invitation relations.
   */
  private get invitationInclude() {
    return invitationInclude;
  }

  /**
   * Create invitations in bulk.
   *
   * Cross-client isolation is enforced by RLS on the site and role queries below.
   * `prisma.build()` sets `app.current_client_id` from the caller's access grant,
   * so `site.findMany` and `role.findMany` only return rows within the caller's
   * client scope (via the `validate_client` RLS policy). The subsequent
   * application-level check (`site.clientId !== targetClientId`) is a defense-in-depth
   * safeguard. The `bypassRLS()` call for the actual insert is safe because all
   * inputs have already been validated through the RLS-enforced queries.
   */
  async createBulk(dto: CreateInvitationsDto) {
    const person = this.cls.requirePerson();
    const accessGrant = this.cls.requireAccessGrant();

    // Determine target clientId
    const targetClientId = dto.clientId || accessGrant.clientId;

    // Collect unique siteIds and roleIds
    const uniqueSiteIds = [...new Set(dto.invitations.map((i) => i.siteId))];
    const uniqueRoleIds = [...new Set(dto.invitations.map((i) => i.roleId))];

    // Validate sites and roles through RLS-enforced queries (scoped to caller's client).
    const prisma = await this.prisma.build();

    const [sites, roles] = await Promise.all([
      prisma.site.findMany({ where: { id: { in: uniqueSiteIds } } }),
      prisma.role.findMany({
        where: {
          id: { in: uniqueRoleIds },
          clientAssignable: accessGrant.scopeAllows('SYSTEM')
            ? undefined
            : true,
        },
      }),
    ]);

    // Validate all sites exist and belong to the target client
    const siteMap = new Map(sites.map((s) => [s.id, s]));
    for (const siteId of uniqueSiteIds) {
      const site = siteMap.get(siteId);
      if (!site) {
        throw new NotFoundException(`Site with ID ${siteId} not found`);
      }
      if (site.clientId !== targetClientId) {
        throw new BadRequestException(
          `Site ${siteId} does not belong to client ${targetClientId}`,
        );
      }
    }

    // Validate all roles exist
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    for (const roleId of uniqueRoleIds) {
      if (!roleMap.get(roleId)) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }
    }

    // Reject if any (email, siteId, roleId) tuple already has a PENDING invitation
    // for the target client. Caller should revoke the existing invite before
    // re-inviting.
    const bypassPrisma = this.prisma.bypassRLS();
    const uniqueEmails = [...new Set(dto.invitations.map((i) => i.email))];
    const existingPending = await bypassPrisma.invitation.findMany({
      where: {
        clientId: targetClientId,
        status: 'PENDING',
        email: { in: uniqueEmails },
        siteId: { in: uniqueSiteIds },
        roleId: { in: uniqueRoleIds },
      },
      select: { email: true, siteId: true, roleId: true },
    });
    if (existingPending.length > 0) {
      const existingKeys = new Set(
        existingPending.map((e) => `${e.email}|${e.siteId}|${e.roleId}`),
      );
      const conflicts = dto.invitations.filter((i) =>
        existingKeys.has(`${i.email}|${i.siteId}|${i.roleId}`),
      );
      if (conflicts.length > 0) {
        throw new ConflictException({
          code: 'INVITATION_ALREADY_PENDING',
          message: `A pending invitation already exists for: ${conflicts
            .map((c) => `${c.email} (site ${c.siteId}, role ${c.roleId})`)
            .join('; ')}. Revoke the existing invitation before re-inviting.`,
          conflicts,
        });
      }
    }

    // Calculate expiration date
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + expiresInDays);

    // Group invitations by (email, clientId) to assign shared groupIds. Today
    // a single createBulk call always targets one clientId, but composing the
    // key defensively keeps grouping correct if that ever changes.
    const groupCounts = new Map<string, number>();
    const groupKey = (email: string) => `${email}|${targetClientId}`;
    for (const inv of dto.invitations) {
      const k = groupKey(inv.email);
      groupCounts.set(k, (groupCounts.get(k) ?? 0) + 1);
    }
    const groupIds = new Map<string, string>();
    for (const [k, count] of groupCounts) {
      if (count > 1) {
        groupIds.set(k, nanoid(18));
      }
    }

    // Build data for all invitations
    const createData = dto.invitations.map((inv) => ({
      code: nanoid(18),
      clientId: targetClientId,
      createdById: person.id,
      email: inv.email,
      roleId: inv.roleId,
      siteId: inv.siteId,
      groupId: groupIds.get(groupKey(inv.email)) ?? null,
      expiresOn,
    }));

    // Create all invitations in a single transaction
    const rows = await bypassPrisma.$transaction(async (tx) => {
      const created = await tx.invitation.createManyAndReturn({
        data: createData,
        select: { id: true },
      });

      return tx.invitation.findMany({
        where: { id: { in: created.map((r) => r.id) } },
        include: this.invitationInclude,
        orderBy: { createdOn: 'asc' },
      });
    });

    // Queue invitation emails: one per group (or one per ungrouped invitation)
    const emailJobs = this.buildInvitationEmails(rows);
    await this.notifications
      .queueEmailBulk(emailJobs)
      .catch((e) =>
        this.logger.error(
          'Failed to queue invitation emails after creation',
          e,
        ),
      );

    return rows.map((invitation) => ({
      ...invitation,
      inviteUrl: this.getInviteUrl(invitation.code),
    }));
  }

  /**
   * Resend the invitation email for an existing invitation.
   * For grouped invitations, resends the grouped email with all assignments.
   */
  async resend(id: string) {
    const rlsPrisma = await this.prisma.build();

    // Authorize access under RLS (enforces client scope), then drop to
    // bypassRLS for the email build — RLS on the Person table can filter out
    // the invitation creator (e.g. super admin), leaving `createdBy` null.
    await rlsPrisma.invitation
      .findUniqueOrThrow({ where: { id }, select: { id: true } })
      .catch(as404OrThrow);

    const prisma = this.prisma.bypassRLS();
    const invitation = await prisma.invitation.findUniqueOrThrow({
      where: { id },
      include: this.invitationInclude,
    });

    // Validate the invitation is still PENDING
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot resend invitation with status ${invitation.status}`,
      );
    }

    const now = new Date();

    // Check if expired by date — auto-expire the entire group, not just this row.
    if (now > invitation.expiresOn) {
      // DON'T update the status to expired. Frontend filters out invitations with status EXPIRED,
      // and uses the expired date to determine true expiration.
      throw new GoneException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired',
      });
    }

    // For grouped invitations, fetch siblings and send a grouped email
    if (invitation.groupId) {
      const siblings = await prisma.invitation.findMany({
        where: {
          groupId: invitation.groupId,
          status: 'PENDING',
          expiresOn: { gt: now },
        },
        include: this.invitationInclude,
        orderBy: { createdOn: 'asc' },
      });
      if (siblings.length === 0) {
        // All siblings revoked/accepted/expired concurrently — fall back.
        await this.notifications.queueEmail(
          this.buildInvitationEmailData(invitation),
        );
      } else {
        await this.notifications.queueEmail(
          this.buildGroupedInvitationEmailData(siblings),
        );
      }
    } else {
      await this.notifications.queueEmail(
        this.buildInvitationEmailData(invitation),
      );
    }

    return {
      ...invitation,
      inviteUrl: this.getInviteUrl(invitation.code),
    };
  }

  /**
   * List invitations with pagination and filtering.
   */
  async findAll(query: QueryInvitationDto) {
    const prisma = await this.prisma.build();

    return prisma.invitation.findManyForPage(
      buildPrismaFindArgs<typeof prisma.invitation>(query, {
        include: this.invitationInclude,
      }),
    );
  }

  /**
   * Get a single invitation by ID.
   */
  async findOne(id: string) {
    const prisma = await this.prisma.build();

    const invitation = await prisma.invitation
      .findUniqueOrThrow({
        where: { id },
        include: this.invitationInclude,
      })
      .catch(as404OrThrow);

    return {
      ...invitation,
      inviteUrl: this.getInviteUrl(invitation.code),
    };
  }

  /**
   * Validate an invitation code (public endpoint).
   * Returns minimal information for security.
   * If the invitation belongs to a group, also returns all assignments in the group.
   */
  async validateCode(code: string) {
    const prisma = this.prisma.bypassRLS();

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { code },
        include: {
          client: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          role: { select: { id: true, name: true, scope: true } },
        },
      });

      if (!invitation || invitation.status !== 'PENDING') {
        throw new GoneException({
          code: 'INVITATION_INVALID',
          message: 'This invitation is no longer valid.',
        });
      }

      // Expiry is derived from `expiresOn`; status is not mutated on expiry
      // (intentionally deprecated). Frontend filters PENDING + date.
      if (new Date() > invitation.expiresOn) {
        throw new GoneException({
          code: 'INVITATION_INVALID',
          message: 'This invitation is no longer valid.',
        });
      }

      // If grouped, fetch sibling assignments
      let assignments: {
        site: { name: string };
        role: { name: string; scope: string };
      }[] = [];
      if (invitation.groupId) {
        assignments = await tx.invitation.findMany({
          where: { groupId: invitation.groupId, status: 'PENDING' },
          select: {
            site: { select: { name: true } },
            role: { select: { name: true, scope: true } },
          },
          orderBy: { createdOn: 'asc' },
        });
      }

      return { invitation, assignments };
    });

    const response = {
      valid: true as const,
      client: result.invitation.client,
      expiresOn: result.invitation.expiresOn.toISOString(),
      email: result.invitation.email,
      // Grouped: return all PENDING sibling assignments; ungrouped: single-element array.
      assignments:
        result.assignments.length > 0
          ? result.assignments.map((a) => ({
              siteName: isClientOrGreater(a.role.scope)
                ? undefined
                : a.site.name,
              roleName: a.role.name,
            }))
          : [
              {
                siteName: isClientOrGreater(result.invitation.role.scope)
                  ? undefined
                  : result.invitation.site.name,
                roleName: result.invitation.role.name,
              },
            ],
    };

    return response;
  }

  /**
   * Accept an invitation (and all grouped siblings, if any).
   */
  async accept(code: string) {
    const user = this.cls.requireUser();
    const person = this.cls.requirePerson();
    const prisma = this.prisma.bypassRLS();

    const accessInclude = {
      client: { select: { id: true, name: true, externalId: true } },
      role: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    };

    // Create client access and update invitation(s) in a transaction.
    const allAccess = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { code },
        include: this.invitationInclude,
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      // REVOKED is the canonical soft-delete; legacy EXPIRED rows are treated
      // identically. New code writes REVOKED, not EXPIRED.
      if (invitation.status === 'REVOKED' || invitation.status === 'EXPIRED') {
        throw new GoneException({
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired',
        });
      }

      if (invitation.status === 'ACCEPTED') {
        throw new GoneException({
          code: 'INVITATION_ALREADY_ACCEPTED',
          message: 'This invitation has already been used',
        });
      }

      // Expiry is derived from `expiresOn`; status is not mutated on expiry.
      if (new Date() > invitation.expiresOn) {
        throw new GoneException({
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired',
        });
      }

      // Email restriction — `invitation.email` is a required column, so no
      // null guard. An empty string would fall through to a failing compare
      // (safer than skipping the check).
      if (person.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new ForbiddenException(
          `This invitation is restricted to a different email address. You are signed in with ${person.email}`,
        );
      }

      // Collect all invitations to accept (grouped or single).
      let invitationsToAccept: InvitationWithRelations[] = [invitation];
      if (invitation.groupId) {
        invitationsToAccept = await tx.invitation.findMany({
          where: {
            groupId: invitation.groupId,
            status: 'PENDING',
          },
          include: this.invitationInclude,
          orderBy: { createdOn: 'asc' },
        });

        // Surface partial-group accepts: siblings revoked/accepted concurrently
        // mean the user gets fewer accesses than the email promised.
        const totalSiblings = await tx.invitation.count({
          where: { groupId: invitation.groupId },
        });
        if (invitationsToAccept.length < totalSiblings) {
          this.logger.warn(
            `Grouped accept for invitation ${invitation.id} (group ${invitation.groupId}): ` +
              `accepting ${invitationsToAccept.length} of ${totalSiblings} sibling(s); ` +
              `the rest are not in PENDING state.`,
          );
        }
      }

      // Check if this is the user's first client access
      const existingPrimaryAccess = await tx.personClientAccess.findFirst({
        where: { personId: person.id, isPrimary: true },
      });

      // Anchor primary on the *clicked* invitation (matched by code), not the
      // oldest-by-createdOn — the user expressed intent by clicking that link.
      const clickedIndex = Math.max(
        0,
        invitationsToAccept.findIndex((inv) => inv.code === code),
      );

      const upsertAccess = (inv: InvitationWithRelations, isPrimary: boolean) =>
        tx.personClientAccess.upsert({
          where: {
            personId_clientId_siteId_roleId: {
              personId: person.id,
              clientId: inv.clientId,
              siteId: inv.siteId,
              roleId: inv.roleId,
            },
          },
          update: { isPrimary },
          create: {
            personId: person.id,
            clientId: inv.clientId,
            siteId: inv.siteId,
            roleId: inv.roleId,
            isPrimary,
          },
          include: accessInclude,
        });

      // Sequential to preserve isPrimary ordering
      const accessRecords: Awaited<ReturnType<typeof upsertAccess>>[] = [];
      for (let i = 0; i < invitationsToAccept.length; i++) {
        const inv = invitationsToAccept[i];

        // Only the clicked invitation is a candidate for primary, and only if
        // the user has no existing primary or their existing primary is for the
        // same client + site.
        const isPrimary =
          i === clickedIndex &&
          (!existingPrimaryAccess ||
            (existingPrimaryAccess.clientId === inv.clientId &&
              existingPrimaryAccess.siteId === inv.siteId));

        accessRecords.push(await upsertAccess(inv, isPrimary));
      }

      // Mark all invitations as accepted
      const now = new Date();
      await tx.invitation.updateMany({
        where: { id: { in: invitationsToAccept.map((inv) => inv.id) } },
        data: {
          status: 'ACCEPTED',
          acceptedById: person.id,
          acceptedOn: now,
        },
      });

      return accessRecords;
    });

    // Invalidate cache for all affected client/site combos
    const cacheClears = allAccess.map((access) =>
      clearAccessGrantResponseCache({
        idpId: user.idpId,
        clientId: access.clientId,
        siteId: access.siteId,
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while accepting invitation',
          e,
        ),
      ),
    );
    await Promise.all(cacheClears);

    return {
      success: true,
      clientAccess: allAccess,
    };
  }

  /**
   * Revoke an invitation (soft delete by changing status).
   * For grouped invitations, revokes all siblings in the group.
   */
  async revoke(id: string) {
    const prisma = await this.prisma.build();

    const invitation = await prisma.invitation
      .findUniqueOrThrow({
        where: { id },
      })
      .catch(as404OrThrow);

    // Cannot revoke accepted invitations
    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException(
        'This invitation is already accepted and cannot be revoked.',
      );
    }

    // Revoke this invitation and all grouped siblings
    if (invitation.groupId) {
      const toRevoke = await prisma.invitation.findMany({
        where: { groupId: invitation.groupId, status: 'PENDING' },
        select: { id: true },
      });
      await prisma.invitation.updateMany({
        where: { groupId: invitation.groupId, status: 'PENDING' },
        data: { status: 'REVOKED' },
      });
      return {
        groupId: invitation.groupId,
        revokedIds: toRevoke.map((r) => r.id),
      };
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
    return { groupId: null, revokedIds: [id] };
  }

  /**
   * Renew an invitation.
   *
   * Implementation note: "renew" is a UX concept — under the hood this is
   * revoke-then-create. The old invitation row(s) are marked REVOKED and a
   * brand new invitation (or group) is created with the same email / site /
   * role. Reasons for this over in-place mutation:
   *   - Creator attribution tracks who re-issued the invite, not who sent
   *     the original.
   *   - Audit trail preserves the full history of attempts.
   *   - The old email's link stops working (security) without special-casing.
   *   - Reuses the existing createBulk path (dedup, grouping, email, caching).
   *
   * Works on PENDING (including date-expired PENDINGs). REVOKED, ACCEPTED,
   * and legacy EXPIRED are rejected — all are treated as soft-deleted.
   * For grouped invites, all PENDING siblings are revoked and the full group
   * is re-created together.
   */
  async renew(
    id: string,
    dto: RenewInvitationDto = { expiresInDays: undefined },
  ) {
    const rlsPrisma = await this.prisma.build();

    // Authorize under RLS (enforces caller's client scope).
    await rlsPrisma.invitation
      .findUniqueOrThrow({ where: { id }, select: { id: true } })
      .catch(as404OrThrow);

    const bypass = this.prisma.bypassRLS();
    const original = await bypass.invitation.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        status: true,
        groupId: true,
        clientId: true,
        email: true,
        siteId: true,
        roleId: true,
      },
    });

    // Anything non-PENDING is considered soft-deleted (REVOKED canonical;
    // legacy EXPIRED treated the same). Only PENDING rows can be renewed;
    // date-expired PENDINGs still qualify.
    if (original.status !== 'PENDING') {
      const msg =
        original.status === 'ACCEPTED'
          ? 'This invitation has already been accepted and cannot be renewed.'
          : 'This invitation has been revoked. Create a new invitation instead.';
      throw new BadRequestException(msg);
    }

    // Collect (email, site, role) tuples to re-invite — full group, or just
    // this row if ungrouped. Only PENDING siblings carry forward.
    const toReplace = original.groupId
      ? await bypass.invitation.findMany({
          where: {
            groupId: original.groupId,
            status: 'PENDING',
          },
          select: { id: true, email: true, siteId: true, roleId: true },
          orderBy: { createdOn: 'asc' },
        })
      : [
          {
            id: original.id,
            email: original.email,
            siteId: original.siteId,
            roleId: original.roleId,
          },
        ];

    if (toReplace.length === 0) {
      throw new BadRequestException(
        'No renewable invitations found for this group.',
      );
    }

    // Revoke the old row(s) first so the downstream createBulk dedup check
    // doesn't trip on the existing PENDING tuple.
    await bypass.invitation.updateMany({
      where: { id: { in: toReplace.map((r) => r.id) } },
      data: { status: 'REVOKED' },
    });

    // Re-issue via the standard create path — handles validation, grouping,
    // email, and cache invalidation the same as a first-time invite.
    return this.createBulk({
      clientId: original.clientId,
      expiresInDays: dto.expiresInDays,
      invitations: toReplace.map((r) => ({
        email: r.email,
        siteId: r.siteId,
        roleId: r.roleId,
      })),
    });
  }

  /**
   * Soft-delete all PENDING invitations whose `expiresOn` is in the past by
   * flipping them to REVOKED. Scoped to the caller's client via RLS.
   *
   * Historically this wrote `EXPIRED`, but EXPIRED is deprecated and treated
   * identically to REVOKED everywhere — anything not PENDING is considered
   * soft-deleted and hidden from the UI. REVOKED is now the canonical
   * soft-delete status.
   */
  async expireStale() {
    const prisma = await this.prisma.build();
    const { count } = await prisma.invitation.updateMany({
      where: { status: 'PENDING', expiresOn: { lt: new Date() } },
      data: { status: 'REVOKED' },
    });
    return { count };
  }
}
