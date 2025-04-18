import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ClsService } from 'nestjs-cls';
import { TVisibility } from 'src/auth/permissions';
import { StatelessUser } from 'src/auth/user.schema';
import { ViewContext } from 'src/common/utils';
import {
  Prisma,
  PrismaClient,
  PrismaPromise,
} from 'src/generated/prisma/client';
import { CommonClsStore } from '../common/types';

interface Person {
  id: string;
  idpId: string | null;
  siteId: string;
  allowedSiteIds: string; // Comma delimited
  clientId: string;
  visibility: TVisibility;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    protected readonly cls: ClsService<CommonClsStore>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  public extended() {
    return this.$extends(extensions.restExtensions());
  }

  public async forUser() {
    const user = this.cls.get('user');
    invariant(user, 'No user in CLS');
    const [clientId, siteId, allowedSiteIds] = await Promise.all([
      this.getUserClientId(user),
      this.getUserSiteId(user),
      this.getAllowedSiteIds(user),
    ]);

    const cacheKey = `person:idpId:${user.idpId}`;
    const createOrUpdatePerson = async () => {
      const prisma = this.bypassRLS();

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

    const person = await this.getFromCacheOrDefault<Person>(
      cacheKey,
      createOrUpdatePerson().then(({ id, siteId, clientId, idpId }) => ({
        id,
        siteId,
        clientId,
        idpId,
        visibility: user.visibility,
        allowedSiteIds,
      })),
      60 * 60 * 1000, // 1 hour
    );

    return this.extended().$extends(extensions.forUser(person));
  }

  public bypassRLS() {
    return this.extended().$extends(extensions.bypassRLS());
  }

  /**
   * Bypasses RLS if user is global admin, otherwise isolates data based on user's client.
   *
   * @returns `this.bypassRLS()` if the user is a global admin, else `await this.forClient()`
   */
  public async forAdminOrUser() {
    const user = this.cls.get('user');
    if (user?.isGlobalAdmin()) {
      return this.bypassRLS();
    } else {
      return await this.forUser();
    }
  }

  public async forContext(_context?: ViewContext) {
    const context = _context ?? this.cls.get('viewContext');
    if (context === 'admin') {
      return this.forAdminOrUser();
    } else {
      return await this.forUser();
    }
  }

  private async getFromCacheOrDefault<
    T extends string | number | boolean | object,
  >(
    cacheKey: string,
    defaultValue: T | Promise<T> | (() => T | Promise<T>),
    timeout?: number,
  ) {
    const cachedValue = await this.cache.get<T>(cacheKey);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const valueOrPromise =
      typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    const value: T = await valueOrPromise;
    await this.cache.set(cacheKey, value, timeout);
    return value;
  }

  private async getUserClientId(user: StatelessUser) {
    return await this.getFromCacheOrDefault<string>(
      `clientId:externalId:${user.clientId}`,
      this.bypassRLS()
        .client.findUniqueOrThrow({
          where: { externalId: user.clientId },
        })
        .then((client) => client.id),
      60 * 60 * 1000,
    ); // 1 hour
  }

  private async getUserSiteId(user: StatelessUser) {
    return await this.getFromCacheOrDefault<string>(
      `siteId:externalId:${user.siteId}`,
      this.bypassRLS()
        .site.findUniqueOrThrow({
          where: { externalId: user.siteId },
        })
        .then((site) => site.id),
      60 * 60 * 1000,
    ); // 1 hour
  }

  private async getAllowedSiteIds(user: StatelessUser) {
    return await this.getFromCacheOrDefault<string>(
      `allowedSiteIds:externalId:${user.siteId}`,
      this.bypassRLS()
        .site.findUniqueOrThrow({
          where: { externalId: user.siteId },
          // For simplicity, only including 2 levels deep (3 total).
          include: {
            subsites: {
              include: {
                subsites: true,
              },
            },
          },
        })
        .then((site) =>
          [
            site.id,
            site.subsites.map((s) => s.id),
            site.subsites.flatMap((s) => s.subsites.map((s) => s.id)),
          ]
            .flat()
            .join(','),
        ),
      60 * 60 * 1000,
    ); // 1 hour
  }
}

export const extensions = {
  bypassRLS: () => {
    return Prisma.defineExtension((prisma) =>
      prisma.$extends({
        client: {
          $viewContext: 'admin' as ViewContext,
        },
        query: {
          $allModels: {
            async $allOperations({ args, query }) {
              const [, result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
                query(args),
              ]);
              return result;
            },
          },
        },
      }),
    );
  },

  forUser: (person: Person) => {
    return Prisma.defineExtension((prisma) => {
      const setContextAndExecute = async <P extends PrismaPromise<any>>(
        transactionArg: P,
      ) => {
        const [, , , , , result] = await prisma.$transaction([
          prisma.$executeRaw`SELECT set_config('app.current_client_id', ${person.clientId}, TRUE)`,
          prisma.$executeRaw`SELECT set_config('app.current_site_id', ${person.siteId}, TRUE)`,
          prisma.$executeRaw`SELECT set_config('app.allowed_site_ids', ${person.allowedSiteIds}, TRUE)`,
          prisma.$executeRaw`SELECT set_config('app.current_person_id', ${person.id}, TRUE)`,
          prisma.$executeRaw`SELECT set_config('app.current_user_visibility', ${person.visibility}, TRUE)`,
          transactionArg,
        ]);
        return result;
      };

      return prisma.$extends({
        client: {
          $currentUser: () => person,
          $viewContext: 'user' as ViewContext,
        },
        query: {
          $allModels: {
            async $allOperations({ args, query, operation, model }) {
              if (
                ['create', 'update'].includes(operation) &&
                'data' in args &&
                ['Manufacturer', 'ProductCategory', 'Product'].includes(model)
              ) {
                args.data = {
                  ...args.data,
                  client: { connect: { id: person.clientId } },
                };
              }
              return await setContextAndExecute(query(args));
            },
          },
          $queryRaw: ({ args, query }) => {
            return setContextAndExecute(query(args));
          },
          $queryRawTyped: ({ args, query }) => {
            return setContextAndExecute(query(args));
          },
          $queryRawUnsafe: ({ args, query }) => {
            return setContextAndExecute(query(args));
          },
          $executeRaw: ({ args, query }) => {
            return setContextAndExecute(query(args));
          },
          $executeRawUnsafe: ({ args, query }) => {
            return setContextAndExecute(query(args));
          },
        },
      });
    });
  },

  restExtensions: () => {
    return Prisma.defineExtension((prisma) =>
      prisma.$extends({
        name: 'restExtensions',
        model: {
          $allModels: {
            async findManyForPage<T>(
              this: T,
              args: Prisma.Args<T, 'findMany'>,
            ): Promise<{
              results: Prisma.Result<T, Prisma.Args<T, 'findMany'>, 'findMany'>;
              count: number;
              limit?: number;
              offset?: number;
            }> {
              const context = Prisma.getExtensionContext(this);
              return Promise.all([
                (context as any).count({ where: args?.where }),
                (context as any).findMany(args),
              ]).then(([count, results]) => ({
                results,
                count,
                limit: results.length,
                offset: args?.skip,
              }));
            },
          },
        },
      }),
    );
  },
};

function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
