import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { clearAccessGrantResponseCache } from 'src/auth/utils/access-grants';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { AddRoleDto } from './dto/add-role.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    private readonly memoryCache: MemoryCacheService,
    private readonly config: ApiConfigService,
    private readonly keycloak: KeycloakService,
    private readonly invitations: InvitationsService,
  ) {}

  /**
   * Common include for member queries.
   */
  private get memberInclude() {
    return {
      clientAccess: {
        select: {
          id: true,
          isPrimary: true,
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
      },
    };
  }

  /**
   * List members with pagination and filtering.
   * Only returns members that have access to the current client.
   */
  async findAll(query: QueryMemberDto = new QueryMemberDto()) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    return prisma.person.findManyForPage(
      buildPrismaFindArgs<typeof prisma.person>(query, {
        include: {
          ...this.memberInclude,
          clientAccess: {
            ...this.memberInclude.clientAccess,
            where: { clientId: accessGrant.clientId },
          },
        },
      }),
    );
  }

  /**
   * Get a single member by ID.
   * Ensures the member has access to the current client.
   */
  async findOne(id: string) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    const person = await prisma.person
      .findFirstOrThrow({
        where: {
          id,
        },
        include: {
          ...this.memberInclude,
          clientAccess: {
            ...this.memberInclude.clientAccess,
            where: { clientId: accessGrant.clientId },
          },
        },
      })
      .catch(as404OrThrow);

    return person;
  }

  /**
   * Invite a new member via the invitations service.
   */
  async invite(dto: InviteMemberDto) {
    const results = await this.invitations.createBulk({
      invitations: [
        {
          email: dto.email,
          siteId: dto.siteId,
          roleId: dto.roleId,
        },
      ],
      expiresInDays: dto.expiresInDays,
    });
    return results[0];
  }

  /**
   * Send a password reset email via Keycloak.
   */
  async sendResetPasswordEmail(id: string, appClientId: string) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    // Get the person and verify they have access to current client
    const person = await prisma.person
      .findFirstOrThrow({
        where: {
          id,
          clientAccess: {
            some: {
              clientId: accessGrant.clientId,
            },
          },
        },
        select: {
          id: true,
          idpId: true,
        },
      })
      .catch(as404OrThrow);

    if (!person.idpId) {
      throw new NotFoundException(
        'Member does not have an identity provider account',
      );
    }

    // Call Keycloak to send reset password email
    await this.keycloak.client.users.resetPasswordEmail({
      id: person.idpId,
      client_id: appClientId,
      redirect_uri: this.config.get('FRONTEND_URL'),
    });

    return {
      success: true,
    };
  }

  /**
   * Add a role to an existing member.
   * The person must already be a member of the current client (RLS enforces this).
   */
  async addRole(id: string, dto: AddRoleDto) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    // Verify person exists and check for existing primary access in one query
    const person = await prisma.person
      .findFirstOrThrow({
        where: { id },
        select: {
          id: true,
          idpId: true,
          clientAccess: {
            where: {
              clientId: accessGrant.clientId,
              siteId: dto.siteId,
              isPrimary: true,
            },
            select: { id: true },
            take: 1,
          },
        },
      })
      .catch(as404OrThrow);

    // Create new PersonClientAccess for this role/site combination
    // isPrimary matches existing primary status for this client + site
    const clientAccess = await prisma.personClientAccess.create({
      data: {
        personId: id,
        clientId: accessGrant.clientId,
        roleId: dto.roleId,
        siteId: dto.siteId,
        isPrimary: person.clientAccess.length > 0,
      },
      include: {
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

    // Invalidate cache for the user's new client access.
    if (person.idpId) {
      await clearAccessGrantResponseCache({
        idpId: person.idpId,
        clientId: clientAccess.clientId,
        siteId: clientAccess.siteId,
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while adding role',
          e,
        ),
      );
    }

    return clientAccess;
  }

  /**
   * Remove a role from an existing member.
   * Cannot remove the last role - a member must have at least one role to remain a member.
   */
  async removeRole(id: string, dto: RemoveRoleDto) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    // Verify person exists and is a member of current client (RLS handles access)
    const person = await prisma.person
      .findFirstOrThrow({
        where: { id },
        select: { id: true, idpId: true },
      })
      .catch(as404OrThrow);

    // Find the specific PersonClientAccess to remove
    const clientAccess = await prisma.$transaction(async (tx) => {
      const clientAccess = await tx.personClientAccess.findFirst({
        where: {
          personId: id,
          clientId: accessGrant.clientId,
          roleId: dto.roleId,
          siteId: dto.siteId,
        },
      });

      if (!clientAccess) {
        throw new NotFoundException(
          'Member does not have this role/site combination',
        );
      }

      // Count how many access rows this person has for this client
      const accessCount = await tx.personClientAccess.count({
        where: {
          personId: id,
          clientId: accessGrant.clientId,
        },
      });

      if (accessCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last role. A member must have at least one role to remain a member of the organization.',
        );
      }

      // Delete the PersonClientAccess
      await tx.personClientAccess.delete({
        where: { id: clientAccess.id },
      });

      // If the deleted row was primary, ensure another row gets promoted
      if (clientAccess.isPrimary) {
        const remainingPrimary = await tx.personClientAccess.findFirst({
          where: { personId: id, isPrimary: true },
        });

        if (!remainingPrimary) {
          const oldestRemaining = await tx.personClientAccess.findFirst({
            where: { personId: id },
            orderBy: { createdOn: 'asc' },
            select: { id: true, clientId: true, siteId: true },
          });

          if (oldestRemaining) {
            await tx.personClientAccess.updateMany({
              where: {
                personId: id,
                clientId: oldestRemaining.clientId,
                siteId: oldestRemaining.siteId,
              },
              data: { isPrimary: true },
            });
          }
        }
      }

      return clientAccess;
    });

    // Invalidate cache for the user's new client access.
    if (person.idpId) {
      await clearAccessGrantResponseCache({
        idpId: person.idpId,
        clientId: clientAccess.clientId,
        siteId: clientAccess.siteId,
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while removing role',
          e,
        ),
      );
    }

    return {
      success: true,
    };
  }

  /**
   * Remove a member from the organization entirely.
   * Deletes all PersonClientAccess rows for this person for the current client.
   * If this was their primary client, promotes the oldest remaining client to primary.
   */
  async remove(id: string) {
    const accessGrant = this.cls.requireAccessGrant();
    const prisma = await this.prisma.build();

    // Get the person with their access rows for this client
    const person = await prisma.person
      .findFirstOrThrow({
        where: { id },
        select: {
          id: true,
          idpId: true,
          clientAccess: {
            select: { id: true, isPrimary: true },
          },
        },
      })
      .catch(as404OrThrow);

    const hadPrimaryAccess = person.clientAccess.some((a) => a.isPrimary);

    const accessRowsToDelete = await prisma.personClientAccess.findMany({
      where: {
        personId: id,
        clientId: accessGrant.clientId,
      },
      select: { id: true, clientId: true, siteId: true },
    });

    await prisma.$transaction(async (tx) => {
      // Delete all PersonClientAccess rows for this client
      await tx.personClientAccess.deleteMany({
        where: {
          personId: id,
          clientId: accessGrant.clientId,
        },
      });

      // If they had primary access here, promote their oldest remaining access to primary
      if (hadPrimaryAccess) {
        const oldestRemainingAccess = await tx.personClientAccess.findFirst({
          where: { personId: id },
          orderBy: { createdOn: 'asc' },
          select: { id: true, clientId: true, siteId: true },
        });

        if (oldestRemainingAccess) {
          // Update all access rows for that client + site to be primary
          await tx.personClientAccess.updateMany({
            where: {
              personId: id,
              clientId: oldestRemainingAccess.clientId,
              siteId: oldestRemainingAccess.siteId,
            },
            data: { isPrimary: true },
          });
        }
      }
    });

    // Invalidate cache for the user's new client access.
    if (person.idpId) {
      await clearAccessGrantResponseCache({
        idpId: person.idpId,
        clientId: accessGrant.clientId,
        siteIds: accessRowsToDelete.map((a) => a.siteId),
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while removing member from organization',
          e,
        ),
      );
    }

    return {
      success: true,
    };
  }
}
