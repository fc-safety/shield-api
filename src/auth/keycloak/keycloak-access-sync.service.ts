import { Injectable, Logger } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { KeycloakService } from './keycloak.service';

const STARTUP_SYNC_DELAY = 1_000;

@Injectable()
export class KeycloakAccessSyncService {
  private readonly logger = new Logger(KeycloakAccessSyncService.name);

  constructor(
    private readonly keycloak: KeycloakService,
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Timeout(STARTUP_SYNC_DELAY)
  async handleSync() {
    if (!this.config.get('SYNC_KEYCLOAK_ACCESS_ON_STARTUP')) return;
    try {
      await this.runSync();
    } catch (err) {
      this.logger.error('Keycloak access sync failed', err);
    }
  }

  async runSync() {
    this.logger.log('Starting Keycloak access sync...');

    const subgroups = await this.keycloak.getManagedRoleSubgroups();
    const db = this.prisma.bypassRLS();

    // Build role map: keycloakGroupId -> dbRoleId
    const dbRoles = await db.role.findMany();
    const dbRolesById = new Map(dbRoles.map((r) => [r.id, r]));

    const roleMap = new Map<string, string>();
    for (const group of subgroups) {
      const shieldRoleId = (group.attributes?.shield_role_id as string[])?.[0];
      if (!shieldRoleId || !group.id) continue;

      const dbRole = dbRolesById.get(shieldRoleId);
      if (!dbRole) {
        this.logger.warn(
          `Keycloak group "${group.name}" references shield_role_id "${shieldRoleId}" but no matching DB role found, skipping`,
        );
        continue;
      }
      roleMap.set(group.id, dbRole.id);
    }

    if (roleMap.size === 0) {
      this.logger.warn(
        'No Keycloak role groups with shield_role_id attribute found, aborting sync',
      );
      return;
    }

    this.logger.log(`Found ${roleMap.size} mapped Keycloak role groups`);

    // Pre-fetch client and site lookup maps (externalId -> id)
    const clients = await db.client.findMany({
      select: { id: true, externalId: true },
    });
    const clientMap = new Map(clients.map((c) => [c.externalId, c.id]));

    const sites = await db.site.findMany({
      select: { id: true, externalId: true },
    });
    const siteMap = new Map(sites.map((s) => [s.externalId, s.id]));

    // Paginate through Keycloak users
    let offset = 0;
    const limit = 100;
    let totalProcessed = 0;
    let totalSynced = 0;

    while (true) {
      const page = await this.keycloak.findUsersByAttribute({ limit, offset });

      for (const user of page.results) {
        try {
          const synced = await this.syncUser(
            user,
            roleMap,
            clientMap,
            siteMap,
            db,
          );
          if (synced) totalSynced++;
        } catch (err) {
          this.logger.error(
            `Failed to sync user ${user.id} (${user.email}), continuing`,
            err,
          );
        } finally {
          totalProcessed++;
        }
      }

      offset += limit;
      if (offset >= page.count) break;
    }

    this.logger.log(
      `Keycloak access sync complete: ${totalProcessed} users processed, ${totalSynced} synced`,
    );
  }

  private async syncUser(
    user: {
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      attributes?: Record<string, string[]>;
    },
    roleMap: Map<string, string>,
    clientMap: Map<string, string>,
    siteMap: Map<string, string>,
    db: ReturnType<PrismaService['bypassRLS']>,
  ): Promise<boolean> {
    if (!user.id) return false;

    const clientExternalId = user.attributes?.client_id?.[0];
    const siteExternalId = user.attributes?.site_id?.[0];

    if (!clientExternalId || !siteExternalId) return false;

    const clientId = clientMap.get(clientExternalId);
    if (!clientId) {
      this.logger.warn(
        `User ${user.email}: client_id "${clientExternalId}" not found in DB, skipping`,
      );
      return false;
    }

    const siteId = siteMap.get(siteExternalId);
    if (!siteId) {
      this.logger.warn(
        `User ${user.email}: site_id "${siteExternalId}" not found in DB, skipping`,
      );
      return false;
    }

    // Get user's Keycloak group memberships
    const userGroups = await this.keycloak.listUserGroups(user.id);

    const matchingRoleIds = userGroups
      .filter((g) => g.id && roleMap.has(g.id))
      .map((g) => roleMap.get(g.id!)!);

    if (matchingRoleIds.length === 0) {
      this.logger.warn(
        `User ${user.email}: no matching Shield roles found, skipping`,
      );
      return false;
    }

    // Wrap write operations in a transaction
    await db.$transaction(async (tx) => {
      // Upsert Person by idpId
      const person = await tx.person.upsert({
        where: { idpId: user.id },
        create: {
          idpId: user.id,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || 'Unknown',
          email: user.email || '',
        },
        update: {
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          email: user.email ?? undefined,
        },
      });

      // Check if this person already has any client access (for isPrimary)
      const existingAccessCount = await tx.personClientAccess.count({
        where: { personId: person.id },
      });

      const isFirstAccess = existingAccessCount === 0;

      // Upsert PersonClientAccess for each matching role
      for (const roleId of matchingRoleIds) {
        await tx.personClientAccess.upsert({
          where: {
            personId_clientId_siteId_roleId: {
              personId: person.id,
              clientId,
              siteId,
              roleId,
            },
          },
          create: {
            personId: person.id,
            clientId,
            siteId,
            roleId,
            // All roles for same first client/site are primary.
            isPrimary: isFirstAccess,
          },
          update: {},
        });
      }
    });

    return true;
  }
}
