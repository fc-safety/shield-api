import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Cache } from 'cache-manager';
import { nanoid } from 'nanoid';
import { ClsService } from 'nestjs-cls';
import { CommonClsStore } from '../../common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService<CommonClsStore>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Generate the invite URL from the code.
   */
  private getInviteUrl(code: string): string {
    const appHost = this.configService.get<string>(
      'APP_HOST',
      'http://localhost:3000',
    );
    return `${appHost}/accept-invite/${code}`;
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
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    // Determine target clientId
    const clientId = dto.clientId || user?.clientId;
    if (!clientId) {
      throw new BadRequestException('Client ID is required');
    }

    // Authorization: Client admins can only create for their own client
    if (!user?.isSystemAdmin() && clientId !== user?.clientId) {
      throw new ForbiddenException(
        'You can only create invitations for your own organization',
      );
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Validate site if provided
    if (dto.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) {
        throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
      }
      if (site.clientId !== clientId) {
        throw new BadRequestException(
          `Site ${dto.siteId} does not belong to client ${clientId}`,
        );
      }
    }

    // Validate role if provided
    if (dto.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }
    }

    // Calculate expiration date
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + expiresInDays);

    // Generate unique code
    const code = nanoid(12);

    // Get creator's person ID
    const person = await prisma.person.findUnique({
      where: { idpId: user?.idpId },
    });
    if (!person) {
      throw new BadRequestException('Could not identify the current user');
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        code,
        clientId,
        createdById: person.id,
        email: dto.email,
        roleId: dto.roleId,
        siteId: dto.siteId,
        expiresOn,
      },
      include: this.invitationInclude,
    });

    return {
      ...invitation,
      inviteUrl: this.getInviteUrl(invitation.code),
    };
  }

  /**
   * List invitations with pagination and filtering.
   */
  async findAll(query: ListInvitationsQueryDto) {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    const where: {
      clientId?: string;
      status?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
    } = {};

    // Scope to client for non-super admins
    if (!user?.isSystemAdmin()) {
      where.clientId = user?.clientId;
    } else if (query.clientId) {
      where.clientId = query.clientId;
    }

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;

    const [results, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: this.invitationInclude,
        orderBy: { createdOn: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.invitation.count({ where }),
    ]);

    return {
      results: results.map((inv) => ({
        ...inv,
        inviteUrl: this.getInviteUrl(inv.code),
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single invitation by ID.
   */
  async findOne(id: string) {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: this.invitationInclude,
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID ${id} not found`);
    }

    // Authorization: Client admins can only view their own client's invitations
    if (!user?.isSystemAdmin() && invitation.clientId !== user?.clientId) {
      throw new ForbiddenException('Not authorized to view this invitation');
    }

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

    const invitation = await prisma.invitation.findUnique({
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

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if expired or revoked
    if (invitation.status === 'EXPIRED' || invitation.status === 'REVOKED') {
      throw new GoneException('This invitation has expired or been revoked');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new GoneException('This invitation has already been used');
    }

    // Check if expired by date
    if (new Date() > invitation.expiresOn) {
      // Auto-update status to EXPIRED
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException('This invitation has expired');
    }

    return {
      valid: true,
      client: invitation.client,
      expiresOn: invitation.expiresOn.toISOString(),
      restrictedToEmail: !!invitation.email,
      hasPreassignedRole: !!invitation.roleId,
    };
  }

  /**
   * Accept an invitation.
   */
  async accept(code: string) {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    if (!user) {
      throw new ForbiddenException(
        'You must be authenticated to accept an invitation',
      );
    }

    const invitation = await prisma.invitation.findUnique({
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
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException('This invitation has expired');
    }

    // Get the current user's person record
    const person = await prisma.person.findUnique({
      where: { idpId: user.idpId },
    });
    if (!person) {
      throw new BadRequestException('Could not identify the current user');
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

    // Check if user already has access to this client
    const existingAccess = await prisma.personClientAccess.findUnique({
      where: {
        personId_clientId: {
          personId: person.id,
          clientId: invitation.clientId,
        },
      },
    });
    if (existingAccess) {
      throw new BadRequestException(
        'You already have access to this organization',
      );
    }

    // Determine the site: use invitation's site or fall back to client's primary site
    let siteId: string | null = invitation.siteId;
    if (!siteId) {
      const primarySite = await prisma.site.findFirst({
        where: { clientId: invitation.clientId, primary: true },
      });
      if (primarySite) {
        siteId = primarySite.id;
      } else {
        const anySite = await prisma.site.findFirst({
          where: { clientId: invitation.clientId },
        });
        siteId = anySite?.id ?? null;
      }
    }

    if (!siteId) {
      throw new BadRequestException('The organization has no sites configured');
    }

    // Determine the role: use invitation's role or find a default role
    let roleId: string | null = invitation.roleId;
    if (!roleId) {
      // Find the default role for the client (or use a system default)
      const defaultRole = await prisma.role.findFirst({
        where: {
          OR: [
            { clientId: invitation.clientId },
            { clientId: null, isSystem: true },
          ],
        },
        orderBy: { isSystem: 'asc' }, // Prefer client-specific roles
      });
      if (!defaultRole) {
        throw new BadRequestException(
          'No default role available for this organization',
        );
      }
      roleId = defaultRole.id;
    }

    // Check if this is the user's first client access
    const existingAccessCount = await prisma.personClientAccess.count({
      where: { personId: person.id },
    });
    const isPrimary = existingAccessCount === 0;

    // Create client access and update invitation in a transaction
    const clientAccess = await prisma.personClientAccess.create({
      data: {
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
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedById: person.id,
        acceptedOn: new Date(),
      },
    });

    // Invalidate cache for the user's new client access
    if (user.idpId && clientAccess.client.externalId) {
      await this.invalidateCacheForPerson(
        user.idpId,
        clientAccess.client.externalId,
      );
    }

    return {
      success: true,
      clientAccess,
    };
  }

  /**
   * Invalidate cache for a person's client access.
   */
  private async invalidateCacheForPerson(
    idpId: string,
    clientExternalId: string,
  ) {
    const cacheKey = `client-access:${idpId}:${clientExternalId}`;
    await this.cache.del(cacheKey);
  }

  /**
   * Revoke an invitation (soft delete by changing status).
   */
  async revoke(id: string) {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID ${id} not found`);
    }

    // Authorization: Client admins can only revoke their own client's invitations
    if (!user?.isSystemAdmin() && invitation.clientId !== user?.clientId) {
      throw new ForbiddenException('Not authorized to revoke this invitation');
    }

    // Cannot revoke accepted invitations
    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot revoke an accepted invitation');
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }
}
