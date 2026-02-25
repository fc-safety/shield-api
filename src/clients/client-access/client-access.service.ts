import { Injectable } from '@nestjs/common';
import { ApiClsService } from 'src/auth/api-cls.service';
import { reduceAccessGrants } from 'src/auth/utils/access-grants';
import { TCapability, VALID_CAPABILITIES } from 'src/auth/utils/capabilities';
import { TScope } from 'src/auth/utils/scope';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TMyClientAccess {
  clientId: string;
  clientName: string;
  siteId: string;
  siteName: string;
  roleId: string;
  scope: TScope;
  capabilities: TCapability[];
}

@Injectable()
export class ClientAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    private readonly config: ApiConfigService,
  ) {}

  /**
   * Get all client access entries for the current user.
   * Access records are grouped by client+site and roles are merged via reduceAccessGrants,
   * so the result contains one entry per client/site combination.
   */
  async getMyClientAccess(): Promise<TMyClientAccess[]> {
    const user = this.cls.get('user');
    if (!user) {
      return [];
    }

    const accesses = await this.prisma.bypassRLS().personClientAccess.findMany({
      where: {
        person: { idpId: user.idpId },
      },
      select: {
        client: {
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
        role: {
          select: {
            id: true,
            name: true,
            scope: true,
            capabilities: true,
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
            clientId: 'unknown',
            clientName: 'System Administration',
            siteId: 'unknown',
            siteName: 'System',
            roleId: 'system-admin',
            scope: RoleScope.SYSTEM,
            capabilities: [...VALID_CAPABILITIES],
          },
        ];
      }

      return [];
    }

    // Group access records by client+site and merge roles within each group.
    const grouped = new Map<string, typeof accesses>();
    for (const access of accesses) {
      const key = `${access.client.id}:${access.site.id}`;
      const group = grouped.get(key);
      if (group) {
        group.push(access);
      } else {
        grouped.set(key, [access]);
      }
    }

    return Array.from(grouped.values()).map((group) => {
      const first = group[0];
      const merged = reduceAccessGrants(
        group.map((a) => ({
          scope: a.role.scope,
          capabilities: a.role.capabilities as TCapability[],
          clientId: a.client.id,
          siteId: a.site.id,
          roleId: a.role.id,
        })),
      );

      return {
        clientId: first.client.id,
        clientName: first.client.name,
        siteId: first.site.id,
        siteName: first.site.name,
        roleId: first.role.id,
        roleName: first.role.name,
        scope: merged.scope,
        capabilities: merged.capabilities,
      };
    });
  }
}
