import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { ClsService } from 'nestjs-cls';
import {
  MULTI_CLIENT_VISIBILITIES,
  MULTI_SITE_VISIBILITIES,
  TVisibility,
} from 'src/auth/permissions';
import { StatelessUser } from 'src/auth/user.schema';
import { CommonClsStore } from 'src/common/types';
import { isNil } from 'src/common/utils';
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
}

export class UserConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserConfigurationError';
  }
}

@Injectable()
export class PeopleService {
  private prisma: PrismaService | undefined;
  private readonly cacheCheckMap = new Map<string, Promise<unknown>>();

  constructor(
    protected readonly cls: ClsService<CommonClsStore>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly moduleRef: ModuleRef,
  ) {}

  public getPrisma() {
    if (!this.prisma) {
      this.prisma = this.moduleRef.get(PrismaService, { strict: false });
    }
    return this.prisma!;
  }

  public async getPersonRepresentation(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    let [clientId, siteId, allowedSiteIdsStr] = [
      null as string | null,
      null as string | null,
      null as string | null,
    ];

    [clientId, siteId, allowedSiteIdsStr] = await Promise.all([
      this.getUserClientId(user),
      this.getUserSiteId(user),
      this.getAllowedSiteIds(user),
    ]);

    const cacheKey = `person:idpId:${user.idpId}`;
    const createOrUpdatePerson = async () => {
      const prisma = this.getPrisma().bypassRLS();

      const existingPerson = await prisma.person.findUnique({
        where: { idpId: user.idpId },
      });

      const data = {
        idpId: user.idpId,
        firstName: user.givenName ?? '',
        lastName: user.familyName ?? '',
        email: user.email,
        username: user.username,
        site: {
          connect: {
            id: siteId,
          },
        },
        client: {
          connect: {
            id: clientId,
          },
        },
      };

      if (existingPerson) {
        return await prisma.person.update({
          where: { id: existingPerson.id },
          data,
        });
      } else {
        return await prisma.person.create({ data });
      }
    };

    const person = await this.getFromCacheOrDefault<PersonRepresentation>(
      cacheKey,
      () =>
        createOrUpdatePerson().then(({ id, siteId, clientId, idpId }) => ({
          id,
          siteId,
          clientId,
          idpId,
          visibility: user.visibility,
          allowedSiteIdsStr,
          hasMultiClientVisibility: MULTI_CLIENT_VISIBILITIES.includes(
            user.visibility,
          ),
          hasMultiSiteVisibility: MULTI_SITE_VISIBILITIES.includes(
            user.visibility,
          ),
        })),
      60 * 60 * 1000, // 1 hour
    );

    return person;
  }

  public async getUserClientId(userInput?: StatelessUser) {
    const user = userInput ?? this.cls.get('user');
    invariant(user, 'No user in CLS');

    return await this.getFromCacheOrDefault<string>(
      `clientId:externalId:${user.clientId}`,
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
      `siteId:externalId:${user.siteId}`,
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
      `allowedSiteIds:externalId:${user.siteId}`,
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
    T extends string | number | boolean | object,
  >(
    cacheKey: string,
    defaultValue: T | Promise<T> | (() => T | Promise<T>),
    timeout?: number,
  ) {
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

          this.cacheCheckMap.delete(cacheKey);

          return value;
        });

      this.cacheCheckMap.set(cacheKey, cacheCheckPromise);
    }

    return (await this.cacheCheckMap.get(cacheKey)) as T;
  }
}

function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
