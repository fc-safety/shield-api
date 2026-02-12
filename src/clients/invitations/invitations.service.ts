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
import { CreateInvitationDto } from './dto/create-invitation.dto';
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
   * Create a new invitation.
   */
  async create(dto: CreateInvitationDto) {
    const person = this.cls.requirePerson();
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    // Determine target clientId
    const targetClientId = dto.clientId || accessGrant.clientId;

    // Validate site exists and belongs to client
    const site = await prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }
    if (site.clientId !== targetClientId) {
      throw new BadRequestException(
        `Site ${dto.siteId} does not belong to client ${targetClientId}`,
      );
    }

    const role = await prisma.role.findUnique({
      where: {
        id: dto.roleId,
        // Make sure that only SYSTEM admins can assign ANY roles to clients.
        clientAssignable: accessGrant.scopeAllows('SYSTEM') ? undefined : true,
      },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
    }

    // Calculate expiration date
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + expiresInDays);

    // Generate unique code
    const code = nanoid(12);

    // Bypass RLS to create invitation to prevent issues with
    // cross-client access grants.
    const invitation = await this.prisma
      .bypassRLS()
      .$transaction(async (tx) => {
        // Create invitation
        const invitation = await tx.invitation.create({
          data: {
            code,
            clientId: site.clientId,
            createdById: person.id,
            email: dto.email,
            roleId: role.id,
            siteId: site.id,
            expiresOn,
          },
          include: this.invitationInclude,
        });

        await this.notifications.queueEmail({
          templateName: 'invitation',
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
        });

        return invitation;
      });

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
