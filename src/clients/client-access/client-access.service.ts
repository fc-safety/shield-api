import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { ApiClsService } from 'src/auth/api-cls.service';
import { VALID_CAPABILITIES } from 'src/auth/utils/capabilities';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClientAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    private readonly config: ApiConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Get all client access entries for the current user.
   */
  async getMyClientAccess() {
    const user = this.cls.get('user');
    if (!user) {
      return [];
    }

    const accesses = await this.prisma.bypassRLS().personClientAccess.findMany({
      where: {
        person: { idpId: user.idpId },
      },
      include: {
        client: {
          select: {
            id: true,
            externalId: true,
            name: true,
          },
        },
        site: {
          select: {
            id: true,
            externalId: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdOn: 'asc',
      },
    });

    // If the user has no access records but is a configured system admin,
    // return an ephemeral access row for bootstrap access.
    if (accesses.length === 0) {
      const systemAdminEmails = this.config.get('SYSTEM_ADMIN_EMAILS');
      if (systemAdminEmails.includes(user.email.toLowerCase())) {
        return [
          {
            id: 'system-admin-bootstrap',
            isPrimary: true,
            createdOn: new Date(),
            modifiedOn: new Date(),
            personId: 'unknown',
            clientId: 'unknown',
            siteId: 'unknown',
            roleId: 'system-admin-bootstrap',
            client: {
              id: 'unknown',
              externalId: null,
              name: 'System Administration',
            },
            site: {
              id: 'unknown',
              externalId: null,
              name: 'System',
            },
            role: {
              id: 'system-admin-bootstrap',
              name: 'System Admin',
              description: 'Bootstrap system administrator access',
              scope: RoleScope.SYSTEM,
              capabilities: [...VALID_CAPABILITIES],
            },
          },
        ];
      }
    }

    return accesses;
  }
}
