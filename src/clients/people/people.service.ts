import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { StatelessUserData } from 'src/auth/user.schema';
import { TCapability } from 'src/auth/utils/capabilities';
import { TScope } from 'src/auth/utils/scope';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PersonRepresentation {
  id: string;
  idpId: string | null;
  siteId: string;
  allowedSiteIdsStr: string; // Comma delimited
  clientId: string;
  scope: TScope;
  capabilities: TCapability[];
  /** Whether user's scope allows access to multiple clients (GLOBAL or SYSTEM) */
  hasMultiClientScope: boolean;
  /** Whether user's scope allows access to all sites in client (CLIENT or above) */
  hasMultiSiteScope: boolean;
}

/**
 * Basic person info that can be retrieved without requiring client context.
 * Used for endpoints that need to work for users who haven't been assigned to a client yet.
 */
export interface PersonBasicInfo {
  id: string | null;
  idpId: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  /** List of clients the user has access to via PersonClientAccess */
  clientAccess: {
    clientId: string;
    clientName: string;
    clientExternalId: string;
    siteId: string;
    siteName: string;
    isPrimary: boolean;
    role: {
      id: string;
      name: string;
      scope: TScope;
      capabilities: TCapability[];
    };
  }[];
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
  private readonly invalidatePersonCache: ({ id }: { id: string }) => void;

  constructor(
    private readonly keycloak: KeycloakService,
    protected readonly cls: ApiClsService,
    protected readonly memoryCache: MemoryCacheService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.invalidatePersonCache = ({ id }) => {
      this.memoryCache.del(getPersonCacheKey({ idpId: id }));
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

  /**
   * Gets basic person info that works for users without client context.
   * This is used for endpoints like /auth/me that need to work for new users
   * who haven't been assigned to a client yet.
   */
  public async getPersonBasicInfo(
    userInput?: StatelessUserData,
  ): Promise<PersonBasicInfo> {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    const prisma = this.getPrisma().bypassRLS();

    // Find existing person or return null id
    const person = await prisma.person.findUnique({
      where: { idpId: user.idpId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Get all client access records for this person
    const clientAccessRecords = person
      ? await prisma.personClientAccess.findMany({
          where: { personId: person.id },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                externalId: true,
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
            isPrimary: 'desc',
          },
        })
      : [];

    return {
      id: person?.id ?? null,
      idpId: user.idpId,
      email: user.email,
      username: user.username,
      firstName: person?.firstName ?? user.givenName ?? null,
      lastName: person?.lastName ?? user.familyName ?? null,
      clientAccess: clientAccessRecords.map((access) => ({
        clientId: access.clientId,
        clientName: access.client.name,
        clientExternalId: access.client.externalId,
        siteId: access.siteId,
        siteName: access.site.name,
        isPrimary: access.isPrimary,
        role: {
          id: access.role.id,
          name: access.role.name,
          scope: access.role.scope,
          capabilities: access.role.capabilities as TCapability[],
        },
      })),
    };
  }

  /**
   * Ensures a Person record exists for the user.
   * Returns the person's internal ID.
   *
   * Note: This only ensures the Person record exists. The client/site
   * are managed via PersonClientAccess, not directly on Person.
   */
  private async getOrCreatePerson(userArg?: StatelessUserData) {
    const user = userArg ?? this.cls.requireUser();
    const cacheKey = `person-id:idpId=${user.idpId}`;

    const prisma = this.getPrisma().bypassRLS();

    const personInput: Prisma.PersonCreateInput = {
      idpId: user.idpId,
      firstName: user.givenName ?? '',
      lastName: user.familyName ?? '',
      email: user.email,
      username: user.username,
    };

    let person = await this.memoryCache.getOrSet<
      Prisma.PersonGetPayload<object>
    >(
      cacheKey,
      async () => {
        return prisma.person.upsert({
          where: { idpId: user.idpId },
          update: personInput,
          create: personInput,
        });
      },
      60 * 60 * 1000, // 1 hour
    );

    // Update person if user data has changed.
    if (
      personInput.firstName !== person.firstName ||
      personInput.lastName !== person.lastName ||
      personInput.email !== person.email ||
      personInput.username !== person.username
    ) {
      person = await prisma.person.update({
        where: { id: person.id },
        data: personInput,
      });
    }

    return person;
  }
}

function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getPersonCacheKey(person: Pick<StatelessUserData, 'idpId'>) {
  return `person:idpId=${person.idpId}`;
}
