import {
  BadRequestException,
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
import { ApiConfigService } from '../../config/api-config.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationsDto } from './dto/create-invitation.dto';
import { QueryInvitationDto } from './dto/query-invitation.dto';

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
   * Build email job data for an invitation.
   */
  private buildInvitationEmailData(invitation: {
    email: string;
    code: string;
    expiresOn: Date;
    client: { name: string };
    site: { name: string };
    role: { name: string };
    createdBy: { firstName: string; lastName: string };
  }) {
    return {
      templateName: 'invitation' as const,
      to: [invitation.email],
      templateProps: {
        clientName: invitation.client.name,
        siteName: invitation.site.name,
        roleName: invitation.role.name,
        inviterFirstName: invitation.createdBy.firstName,
        inviterLastName: invitation.createdBy.lastName,
        inviteUrl: this.getInviteUrl(invitation.code),
        expiresOn: invitation.expiresOn.toISOString(),
      },
    };
  }

  /**
   * Common include for invitation relations.
   */
  private get invitationInclude() {
    return {
      client: {
        select: {
          id: true,
          name: true,
          externalId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      acceptedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  /**
   * Create invitations in bulk.
   */
  async createBulk(dto: CreateInvitationsDto) {
    const person = this.cls.requirePerson();
    const accessGrant = this.cls.requireAccessGrant();

    // Determine target clientId
    const targetClientId = dto.clientId || accessGrant.clientId;

    // Collect unique siteIds and roleIds
    const uniqueSiteIds = [...new Set(dto.invitations.map((i) => i.siteId))];
    const uniqueRoleIds = [...new Set(dto.invitations.map((i) => i.roleId))];

    // Bulk validate sites and roles
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

    // Calculate expiration date
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + expiresInDays);

    // Build data for all invitations
    const createData = dto.invitations.map((inv) => ({
      code: nanoid(12),
      clientId: targetClientId,
      createdById: person.id,
      email: inv.email,
      roleId: inv.roleId,
      siteId: inv.siteId,
      expiresOn,
    }));

    // Create all invitations in a single transaction
    const bypassPrisma = this.prisma.bypassRLS();
    const rows = await bypassPrisma.$transaction(async (tx) => {
      // Bulk create and return the new records (select id only; include not supported)
      const created = await tx.invitation.createManyAndReturn({
        data: createData,
        select: { id: true },
      });

      // Fetch full records with relations
      return tx.invitation.findMany({
        where: { id: { in: created.map((r) => r.id) } },
        include: this.invitationInclude,
        orderBy: { createdOn: 'asc' },
      });
    });

    // Queue all invitation emails in bulk
    await this.notifications
      .queueEmailBulk(rows.map((inv) => this.buildInvitationEmailData(inv)))
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
   */
  async resend(id: string) {
    const prisma = await this.prisma.build();

    const invitation = await prisma.invitation
      .findUniqueOrThrow({
        where: { id },
        include: this.invitationInclude,
      })
      .catch(as404OrThrow);

    // Validate the invitation is still PENDING
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot resend invitation with status ${invitation.status}`,
      );
    }

    // Check if expired by date
    if (new Date() > invitation.expiresOn) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException('This invitation has expired');
    }

    // Queue the invitation email again
    await this.notifications.queueEmail(
      this.buildInvitationEmailData(invitation),
    );

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
    const prisma = this.prisma.bypassRLS();

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
   */
  async validateCode(code: string) {
    const prisma = this.prisma.bypassRLS();

    const invitation = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { code },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!invitation || invitation.status !== 'PENDING') {
        throw new GoneException('This invitation is no longer valid.');
      }

      // Check if expired by date
      if (new Date() > invitation.expiresOn) {
        // Auto-update status to EXPIRED
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
        throw new GoneException('This invitation is no longer valid.');
      }

      return invitation;
    });

    return {
      valid: true,
      client: invitation.client,
      expiresOn: invitation.expiresOn.toISOString(),
      email: invitation.email,
    };
  }

  /**
   * Accept an invitation.
   */
  async accept(code: string) {
    const user = this.cls.requireUser();
    const person = this.cls.requirePerson();
    const prisma = this.prisma.bypassRLS();

    // Create client access and update invitation in a transaction. This prevents
    // race conditions where the invitation is accepted and the client access is not created,
    // or where the invitation is accepted in separate request.
    const clientAccess = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { code },
        include: this.invitationInclude,
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      // Check status
      if (invitation.status === 'EXPIRED' || invitation.status === 'REVOKED') {
        throw new GoneException('This invitation has expired');
      }

      if (invitation.status === 'ACCEPTED') {
        throw new GoneException('This invitation has already been used');
      }

      // Check expiration date
      if (new Date() > invitation.expiresOn) {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
        throw new GoneException('This invitation has expired');
      }

      // Check email restriction
      if (
        invitation.email &&
        person.email.toLowerCase() !== invitation.email.toLowerCase()
      ) {
        throw new ForbiddenException(
          'This invitation is restricted to a different email address',
        );
      }

      // Use the site and role from the invitation (both are required)
      const { siteId, roleId } = invitation;

      // Check if this is the user's first client access
      const existingPrimaryAccess = await tx.personClientAccess.findFirst({
        where: { personId: person.id, isPrimary: true },
      });

      // Is primary if first access grant, or if existing primary access is for the same client and site.
      const isPrimary =
        !existingPrimaryAccess ||
        (existingPrimaryAccess.clientId === invitation.clientId &&
          existingPrimaryAccess.siteId === siteId);

      const newAccess = await tx.personClientAccess.upsert({
        where: {
          personId_clientId_siteId_roleId: {
            personId: person.id,
            clientId: invitation.clientId,
            siteId,
            roleId,
          },
        },
        update: {
          isPrimary,
        },
        create: {
          personId: person.id,
          clientId: invitation.clientId,
          siteId,
          roleId,
          isPrimary,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              externalId: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedById: person.id,
          acceptedOn: new Date(),
        },
      });

      return newAccess;
    });

    // Invalidate cache for the user's new client access.
    await clearAccessGrantResponseCache({
      idpId: user.idpId,
      clientId: clientAccess.clientId,
      siteId: clientAccess.siteId,
      deleteFn: (keys) => this.memoryCache.mdel(keys),
    }).catch((e) =>
      this.logger.error(
        'Error invalidating access grant cache while accepting invitation',
        e,
      ),
    );

    return {
      success: true,
      clientAccess,
    };
  }

  /**
   * Revoke an invitation (soft delete by changing status).
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

    await prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }
}
