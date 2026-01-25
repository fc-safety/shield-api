import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { ClsService } from 'nestjs-cls';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import {
  MULTI_CLIENT_VISIBILITIES,
  MULTI_SITE_VISIBILITIES,
  TPermission,
  TVisibility,
  VISIBILITY_VALUES,
} from 'src/auth/permissions';
import { StatelessUser } from 'src/auth/user.schema';
import { CommonClsStore } from 'src/common/types';
import { isNil } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PersonRepresentation {
  id: string;
  idpId: string | null;
  siteId: string;
  allowedSiteIdsStr: string; // Comma delimited
  clientId: string;
  visibility: TVisibility;
  hasMultiClientVisibility: boolean;
  hasMultiSiteVisibility: boolean;
  /** Permissions from database role (when USE_DATABASE_PERMISSIONS is enabled) */
  permissions?: TPermission[];
}

export class UserConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserConfigurationError';
  }
}

@Injectable()
export class PeopleService implements OnModuleDestroy {
  private prisma: PrismaService | undefined;
  private readonly cacheCheckMap = new Map<string, Promise<unknown>>();
  private readonly invalidatePersonCache: ({ id }: { id: string }) => void;

  constructor(
    private readonly keycloak: KeycloakService,
    protected readonly cls: ClsService<CommonClsStore>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly moduleRef: ModuleRef,
    private readonly config: ApiConfigService,
  ) {
    this.invalidatePersonCache = ({ id }) => {
      this.cache.del(getPersonCacheKey({ idpId: id }));
    };

    // Invalidate the person cache for the user when they are updated or their group membership changes.
    this.keycloak.events.users.on('update', this.invalidatePersonCache);
    this.keycloak.events.users.on('addToGroup', this.invalidatePersonCache);
    this.keycloak.events.users.on('delFromGroup', this.invalidatePersonCache);
  }

  public onModuleDestroy() {
    this.keycloak.events.users.off('update', this.invalidatePersonCache);
    this.keycloak.events.users.off('addToGroup', this.invalidatePersonCache);
    this.keycloak.events.users.off('delFromGroup', this.invalidatePersonCache);
  }

  public getPrisma() {
    if (!this.prisma) {
      this.prisma = this.moduleRef.get(PrismaService, { strict: false });
    }
    return this.prisma!;
  }

  public async getPersonRepresentation(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    // Check if user is switching to a different client
    const activeClientId = this.cls.get('activeClientId');
    const isSwitchingClient =
      activeClientId && activeClientId !== user.clientId;

    // Always get primary client/site for Person record
    const [primaryClientId, primarySiteId] = await Promise.all([
      this.getUserClientId(user),
      this.getUserSiteId(user),
    ]);

    // Ensure Person record exists (with primary client/site)
    const personId = await this.ensurePersonExists(
      user,
      primaryClientId,
      primarySiteId,
    );

    // If switching client, get context from PersonClientAccess
    if (isSwitchingClient) {
      const switchedContext = await this.getSwitchedClientContext(
        personId,
        activeClientId,
      );

      if (!switchedContext) {
        // This shouldn't happen if ActiveClientGuard ran correctly,
        // but handle it gracefully
        throw new UserConfigurationError(
          'You do not have access to the requested client.',
        );
      }

      return switchedContext;
    }

    // Standard flow - use primary client/site from JWT
    const allowedSiteIdsStr = await this.getAllowedSiteIds(user);
    const cacheKey = getPersonCacheKey(user);

    // Check if we should use database permissions instead of JWT
    const useDatabasePermissions = this.config.get('USE_DATABASE_PERMISSIONS');

    return this.getFromCacheOrDefault<PersonRepresentation>(
      cacheKey,
      async () => {
        let visibility = user.visibility;
        let permissions: TPermission[] | undefined;

        // If database permissions are enabled, try to load from PersonClientAccess
        if (useDatabasePermissions) {
          const dbPermissions = await this.getPrimaryClientPermissions(
            personId,
            primaryClientId,
          );

          if (dbPermissions) {
            permissions = dbPermissions;
            visibility = this.extractVisibilityFromPermissions(dbPermissions);
          }
          // If no PersonClientAccess exists, fall back to JWT permissions
        }

        return {
          id: personId,
          siteId: primarySiteId,
          clientId: primaryClientId,
          idpId: user.idpId,
          visibility,
          allowedSiteIdsStr,
          hasMultiClientVisibility:
            MULTI_CLIENT_VISIBILITIES.includes(visibility),
          hasMultiSiteVisibility: MULTI_SITE_VISIBILITIES.includes(visibility),
          permissions,
        };
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  /**
   * Ensures a Person record exists for the user with their primary client/site.
   * Returns the person's internal ID.
   */
  private async ensurePersonExists(
    user: StatelessUser,
    clientId: string,
    siteId: string,
  ): Promise<string> {
    const cacheKey = `person-id:idpId=${user.idpId}`;

    return this.getFromCacheOrDefault<string>(
      cacheKey,
      async () => {
        const prisma = this.getPrisma().bypassRLS();

        const existingPerson = await prisma.person.findUnique({
          where: { idpId: user.idpId },
          select: { id: true },
        });

        if (existingPerson) {
          // Update with latest info from JWT
          await prisma.person.update({
            where: { id: existingPerson.id },
            data: {
              firstName: user.givenName ?? '',
              lastName: user.familyName ?? '',
              email: user.email,
              username: user.username,
              siteId,
              clientId,
            },
          });
          return existingPerson.id;
        }

        const newPerson = await prisma.person.create({
          data: {
            idpId: user.idpId,
            firstName: user.givenName ?? '',
            lastName: user.familyName ?? '',
            email: user.email,
            username: user.username,
            siteId,
            clientId,
          },
        });

        return newPerson.id;
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  /**
   * Gets PersonRepresentation for a switched client context.
   * Uses PersonClientAccess to determine the site and role for that client.
   */
  private async getSwitchedClientContext(
    personId: string,
    clientExternalId: string,
  ): Promise<PersonRepresentation | null> {
    const cacheKey = `person-switched:${personId}:${clientExternalId}`;

    return this.getFromCacheOrDefault<PersonRepresentation | null>(
      cacheKey,
      async () => {
        const prisma = this.getPrisma().bypassRLS();

        const access = await prisma.personClientAccess.findFirst({
          where: {
            personId,
            client: { externalId: clientExternalId },
          },
          include: {
            client: { select: { id: true } },
            site: { select: { id: true } },
            role: { include: { permissions: true } },
          },
        });

        if (!access) {
          return null;
        }

        // Get allowed site IDs for the switched site
        const allowedSiteIdsStr = await this.getAllowedSiteIdsForSite(
          access.siteId,
        );

        // Extract permissions from role
        const permissions = access.role.permissions.map(
          (p) => p.permission as TPermission,
        );
        const visibility = this.extractVisibilityFromPermissions(permissions);

        return {
          id: personId,
          idpId: null, // Not needed for RLS context
          siteId: access.siteId,
          clientId: access.clientId,
          visibility,
          allowedSiteIdsStr,
          hasMultiClientVisibility:
            MULTI_CLIENT_VISIBILITIES.includes(visibility),
          hasMultiSiteVisibility: MULTI_SITE_VISIBILITIES.includes(visibility),
          permissions,
        };
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  /**
   * Extracts the visibility level from a list of permission strings.
   */
  private extractVisibilityFromPermissions(
    permissions: (string | TPermission)[],
  ): TVisibility {
    const visibilityPermissions = permissions
      .filter((p) => p.startsWith('visibility:'))
      .map((p) => p.replace('visibility:', '') as TVisibility);

    // Return the most permissive visibility level
    for (const visibility of VISIBILITY_VALUES) {
      if (visibilityPermissions.includes(visibility)) {
        return visibility;
      }
    }

    return 'self';
  }

  /**
   * Gets permissions from PersonClientAccess for a user's primary client.
   * Used when USE_DATABASE_PERMISSIONS is enabled.
   */
  private async getPrimaryClientPermissions(
    personId: string,
    clientId: string,
  ): Promise<TPermission[] | null> {
    const cacheKey = `person-primary-permissions:${personId}:${clientId}`;

    return this.getFromCacheOrDefault<TPermission[] | null>(
      cacheKey,
      async () => {
        const prisma = this.getPrisma().bypassRLS();

        // Look for PersonClientAccess with isPrimary=true
        const access = await prisma.personClientAccess.findFirst({
          where: {
            personId,
            clientId,
            isPrimary: true,
          },
          include: {
            role: { include: { permissions: true } },
          },
        });

        if (!access) {
          return null;
        }

        return access.role.permissions.map((p) => p.permission as TPermission);
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  /**
   * Gets comma-delimited allowed site IDs for a specific site (internal ID).
   * Similar to getAllowedSiteIds but takes internal site ID instead of user context.
   */
  private async getAllowedSiteIdsForSite(siteId: string): Promise<string> {
    const cacheKey = `allowed-site-ids:siteId=${siteId}`;

    return this.getFromCacheOrDefault<string>(
      cacheKey,
      async () => {
        const site = await this.getPrisma()
          .bypassRLS()
          .site.findUnique({
            where: { id: siteId },
            select: {
              id: true,
              subsites: {
                select: {
                  id: true,
                  subsites: {
                    select: {
                      id: true,
                      subsites: { select: { id: true } },
                    },
                  },
                },
              },
            },
          });

        if (!site) {
          return siteId;
        }

        // Flatten 3 levels deep
        return [
          site.id,
          ...site.subsites.flatMap((s1) => [
            s1.id,
            ...s1.subsites.flatMap((s2) => [
              s2.id,
              ...s2.subsites.map((s3) => s3.id),
            ]),
          ]),
        ].join(',');
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  public async getUserClientId(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    return await this.getFromCacheOrDefault<string>(
      `clientId:externalId=${user.clientId}`,
      () =>
        this.getPrisma()
          .bypassRLS()
          .client.findUniqueOrThrow({
            select: { id: true },
            where: { externalId: user.clientId },
          })
          .catch((e) => {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === 'P2025'
            ) {
              throw new UserConfigurationError(
                'Unable to find a valid client account for your user. Please contact your administrator to ensure your account is properly configured.',
              );
            }
            throw e;
          })
          .then(({ id }) => id),
      60 * 60 * 1000,
    ); // 1 hour
  }

  public async getUserSiteId(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    return await this.getFromCacheOrDefault<string>(
      `siteId:externalId=${user.siteId}`,
      () =>
        this.getPrisma()
          .bypassRLS()
          .site.findUniqueOrThrow({
            select: { id: true },
            where: { externalId: user.siteId },
          })
          .catch((e) => {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === 'P2025'
            ) {
              throw new UserConfigurationError(
                'Unable to find a valid site assignment your user. Please contact your administrator to ensure your account is properly configured.',
              );
            }
            throw e;
          })
          .then(({ id }) => id),
      60 * 60 * 1000,
    ); // 1 hour
  }

  public async getAllowedSiteIds(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    return await this.getFromCacheOrDefault<string>(
      `flattenedSiteIds:externalId=${user.siteId}`,
      () =>
        this.getPrisma()
          .bypassRLS()
          .site.findUnique({
            select: {
              id: true,
              // For simplicity, only including 2 levels deep (3 total).
              subsites: {
                select: { id: true, subsites: { select: { id: true } } },
              },
            },
            where: { externalId: user.siteId },
          })
          .then((site) =>
            site
              ? [
                  site.id,
                  site.subsites.map((s) => s.id),
                  site.subsites.flatMap((s) => s.subsites.map((s) => s.id)),
                ]
                  .flat()
                  .join(',')
              : '',
          ),
      60 * 60 * 1000,
    ); // 1 hour
  }

  private async getFromCacheOrDefault<
    T extends string | number | boolean | object | null,
  >(
    cacheKey: string,
    defaultValue: T | Promise<T> | (() => T | Promise<T>),
    timeout?: number,
  ) {
    // If the cache key is not in the map, create a new promise to check the cache.
    // This is to avoid race conditions where multiple requests are made for the same cache key.
    if (!this.cacheCheckMap.has(cacheKey)) {
      const cacheCheckPromise = this.cache
        .get<T>(cacheKey)
        .then(async (cachedValue) => {
          if (!isNil(cachedValue)) {
            return cachedValue;
          }

          const valueOrPromise =
            typeof defaultValue === 'function' ? defaultValue() : defaultValue;
          const value: T = await valueOrPromise;
          await this.cache.set(cacheKey, value, timeout);

          return value;
        })
        .finally(() => {
          this.cacheCheckMap.delete(cacheKey);
        });

      this.cacheCheckMap.set(cacheKey, cacheCheckPromise);
    }

    return (await this.cacheCheckMap.get(cacheKey)) as T;
  }
}

function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getPersonCacheKey(person: Pick<StatelessUser, 'idpId'>) {
  return `person:idpId=${person.idpId}`;
}
