import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiClsService } from 'src/auth/api-cls.service';
import { TAccessGrant, TScope } from 'src/auth/auth.types';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { isNil } from 'src/common/utils';
import { Prisma, PrismaClient } from 'src/generated/prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { PrismaAdapter } from './prisma.adapter';

const DEFAULT_PRISMA_OPTIONS = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
} satisfies Pick<Prisma.PrismaClientOptions, 'log'>;

export type PrismaTxClient = Parameters<
  Parameters<Awaited<ReturnType<PrismaService['build']>>['$transaction']>[0]
>[0];

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions & typeof DEFAULT_PRISMA_OPTIONS
  >
  implements OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    protected readonly cls: ApiClsService,
    private readonly redis: RedisService,
    private readonly memoryCache: MemoryCacheService,
    private readonly prismaAdapter: PrismaAdapter,
  ) {
    super({
      adapter: prismaAdapter,
      ...DEFAULT_PRISMA_OPTIONS,
    });
  }

  async onModuleInit() {
    await this.$connect();

    this.logger.log('PrismaService initialized');
    this.$on('query', (e) => {
      const { model, action } = this.parsePrismaQuery(e.query);

      this.logger.verbose(`Query: ${e.query}`, {
        model,
        action,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  public bypassRLS(options?: BypassRLSExtensionOptions) {
    return this.$extends(this.buildBypassRLSExtension(options));
  }

  public async build(options: PrimaryExtensionOptions = {}) {
    return this.$extends(await this.buildPrimaryExtension(options));
  }

  private emitModelEvent({
    model,
    operation,
    result,
    accessGrant,
  }: {
    model: string;
    operation: string;
    result: unknown;
    accessGrant: TAccessGrant;
  }) {
    if (
      ![
        'create',
        'createMany',
        'createManyAndReturn',
        'update',
        'updateMany',
        'updateManyAndReturn',
        'delete',
        'deleteMany',
      ].includes(operation)
    ) {
      return;
    }

    let cleanedOperation = operation;
    switch (operation) {
      case 'createMany':
      case 'createManyAndReturn':
        cleanedOperation = 'create';
        break;
      case 'updateMany':
      case 'updateManyAndReturn':
        cleanedOperation = 'update';
        break;
      case 'deleteMany':
        cleanedOperation = 'delete';
        break;
      default:
        break;
    }

    const eventBody: Record<string, string> = {
      model,
      operation: cleanedOperation,
    };

    if (typeof result === 'object' && !isNil(result) && 'id' in result) {
      eventBody.id = String(result.id);
    }

    const channel = `db-events:${accessGrant.clientId}:${model}:${cleanedOperation}`;
    const payload = JSON.stringify(eventBody);

    this.redis.getPublisher().publish(channel, payload);
  }

  private parsePrismaQuery(query: string): { model?: string; action?: string } {
    // Normalize and sanitize input
    const normalizedQuery = query.trim();

    // Define patterns
    const createPattern = /insert into "public"\."([^"]+)"/i;
    const updatePattern = /update "public"\."([^"]+)"/i;
    const deletePattern = /delete from "public"\."([^"]+)"/i;
    const selectPattern = /select .* from "public"\."([^"]+)"/i;

    // Match against known actions
    if (createPattern.test(normalizedQuery)) {
      const [, model] = normalizedQuery.match(createPattern)!;
      return { model, action: 'create' };
    }

    if (updatePattern.test(normalizedQuery)) {
      const [, model] = normalizedQuery.match(updatePattern)!;
      return { model, action: 'update' };
    }

    if (deletePattern.test(normalizedQuery)) {
      const [, model] = normalizedQuery.match(deletePattern)!;
      return { model, action: 'delete' };
    }

    if (selectPattern.test(normalizedQuery)) {
      const [, model] = normalizedQuery.match(selectPattern)!;
      return { model, action: 'read' };
    }

    return {};
  }

  private buildBypassRLSExtension(options: BypassRLSExtensionOptions = {}) {
    return Prisma.defineExtension((prisma) => {
      const mode = this.cls.get('mode');
      // Build base extension that all subsequent extensions will build upon.
      const extendedPrisma = prisma.$extends({
        client: {
          $viewContext: 'admin' as const,
          $rlsContext: () => options.rlsContext,
          $mode: mode ?? 'request',
        },
        model: {
          $allModels: {
            findManyForPage: findManyForPageExtensionFn,
          },
        },
      });

      // Define helper function to set RLS context and execute a query.
      const setRLSContextAndExecute = async <
        A extends Prisma.Args<any, any>,
        P extends Prisma.PrismaPromise<any>,
      >(
        query: (args: A) => P,
        args: A,
      ) => {
        const rlsContextStatements = buildRLSContextStatements(
          extendedPrisma,
          true,
        );
        const statementResults = await extendedPrisma.$transaction([
          ...rlsContextStatements,
          query(args),
        ]);
        return statementResults[statementResults.length - 1];
      };

      // Extend transactions and query methods to set RLS context before executing the query.
      return extendedPrisma.$extends({
        client: {
          $transaction: async <T>(
            fn: (
              tx: Parameters<
                Parameters<typeof extendedPrisma.$transaction>[0]
              >[0],
            ) => Promise<T> | T,
            ...rest: Parameters<typeof extendedPrisma.$transaction> extends [
              any,
              ...infer R,
            ]
              ? R
              : never
          ): Promise<T> => {
            return await extendedPrisma.$transaction(
              async (tx) => {
                await Promise.all(buildRLSContextStatements(tx, true));
                return await fn(tx);
              },
              ...rest,
            );
          },
        },
        query: {
          $allModels: {
            async $allOperations({ args, query }) {
              return setRLSContextAndExecute(query, args);
            },
          },
          $queryRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $queryRawTyped: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $queryRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $executeRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $executeRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
        },
      });
    });
  }

  private async getAllowedSiteIdsForSite(siteId: string): Promise<string[]> {
    const cacheKey = `allowed-site-ids:siteId=${siteId}`;

    return this.memoryCache.getOrSet<string[]>(
      cacheKey,
      async () => {
        const site = await this.bypassRLS().site.findUnique({
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
          return [siteId];
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
        ];
      },
      60 * 60 * 1000, // 1 hour
    );
  }

  private async buildPrimaryExtension(options: PrimaryExtensionOptions) {
    const viewContext = this.cls.viewContext;
    const person = this.cls.get('person');
    const accessGrant = this.cls.get('accessGrant');

    const mode = this.cls.get('mode');
    const shouldBypassRLS = mode === 'cron';

    let rlsContext: IPrismaRLSContext | undefined = options.rlsContext;
    if (accessGrant && person) {
      const allowedSiteIds = await this.getAllowedSiteIdsForSite(
        accessGrant.siteId,
      );
      const allowedSiteIdsStr = allowedSiteIds.join(',');
      rlsContext = {
        personId: person.id,
        clientId: accessGrant.clientId,
        siteId: accessGrant.siteId,
        allowedSiteIds,
        allowedSiteIdsStr,
        scope: accessGrant.scope,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const thisPrismaService = this;

    return Prisma.defineExtension((prisma) => {
      // Build base extension that all subsequent extensions will build upon.
      const extendedPrisma = prisma.$extends({
        client: {
          $rlsContext: () => rlsContext,
          $viewContext: viewContext,
          $mode: mode ?? 'request',
        },
        model: {
          $allModels: {
            findManyForPage: findManyForPageExtensionFn,
          },
        },
        query: {
          $allModels: {
            async $allOperations({ args, query, operation, model }) {
              if (!shouldBypassRLS && accessGrant) {
                setModelClientOwnershipForAccessGrant(
                  args,
                  model,
                  operation,
                  accessGrant,
                );
              }

              const result = await query(args);

              // Emit event to Redis.
              if (accessGrant) {
                thisPrismaService.emitModelEvent({
                  model,
                  operation,
                  result,
                  accessGrant,
                });
              }

              return result;
            },
          },
        },
      });

      // Define helper function to set RLS context and execute a query.
      const setRLSContextAndExecute = async <
        A extends Prisma.Args<any, any>,
        P extends Prisma.PrismaPromise<any>,
      >(
        query: (args: A) => P,
        args: A,
      ) => {
        const rlsContextStatements = buildRLSContextStatements(
          extendedPrisma,
          shouldBypassRLS,
          rlsContext,
        );

        const statementResults = await extendedPrisma.$transaction([
          ...rlsContextStatements,
          query(args),
        ]);
        return statementResults[statementResults.length - 1];
      };

      // Extend transactions and query methods to set RLS context before executing the query.
      return extendedPrisma.$extends({
        client: {
          /**
           * Wraps $transaction to ensure RLS context is set up before executing the transaction.
           * The return type is correctly inferred from the return type of the provided function.
           * @param fn - The transactional function to execute.
           * @param rest - Additional arguments for $transaction.
           */
          $transaction: <T>(
            fn: (
              tx: Parameters<
                Parameters<typeof extendedPrisma.$transaction>[0]
              >[0],
            ) => Promise<T> | T,
            ...rest: Parameters<typeof extendedPrisma.$transaction> extends [
              any,
              ...infer R,
            ]
              ? R
              : never
          ): Promise<T> => {
            return extendedPrisma.$transaction(
              async (tx) => {
                await Promise.all(
                  buildRLSContextStatements(tx, shouldBypassRLS, rlsContext),
                );
                return fn(tx);
              },
              ...rest,
            );
          },
        },
        query: {
          $allModels: {
            $allOperations({ args, query }) {
              return setRLSContextAndExecute(query, args);
            },
          },
          $queryRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $queryRawTyped: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $queryRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $executeRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
          $executeRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query, args);
          },
        },
      });
    });
  }
}

export interface IPrismaRLSContext {
  personId: string;
  clientId: string;
  siteId: string;
  allowedSiteIds: string[];
  allowedSiteIdsStr: string;
  scope: TScope;
}

export interface PrimaryExtensionOptions {
  rlsContext?: IPrismaRLSContext;
}

export interface BypassRLSExtensionOptions {
  rlsContext?: IPrismaRLSContext;
}

function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: true,
): Prisma.PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: false,
  rlsContext: IPrismaRLSContext,
): Prisma.PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: boolean,
  rlsContext?: IPrismaRLSContext,
): Prisma.PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: boolean,
  rlsContext?: IPrismaRLSContext,
) {
  if (shouldBypassRLS) {
    return [
      prismaClient.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
    ];
  }

  if (!rlsContext) {
    throw new Error('RLS context is required when RLS is not bypassed');
  }

  return [
    prismaClient.$executeRaw`SELECT set_config('app.current_client_id', ${rlsContext.clientId}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_site_id', ${rlsContext.siteId}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.allowed_site_ids', ${rlsContext.allowedSiteIdsStr}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_person_id', ${rlsContext.personId}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_user_scope', ${rlsContext.scope}, TRUE)`,
  ];
}

/**
 * For certain models that are conditionally owned by a particular client,
 * set the client ID on the model input to the person's client ID.
 *
 * @param args - The arguments for the query.
 * @param model - The model being queried.
 * @param operation - The operation being performed.
 * @param person - The person for whom the query is being executed.
 */
function setModelClientOwnershipForAccessGrant<T>(
  args: Prisma.Args<T, 'create' | 'update'>,
  model: string,
  operation: string,
  accessGrant: Pick<TAccessGrant, 'clientId'>,
) {
  if (
    ['create', 'update'].includes(operation) &&
    'data' in args &&
    ['Manufacturer', 'ProductCategory', 'Product', 'AssetQuestion'].includes(
      model,
    ) &&
    !args.data?.clientId &&
    !args.data?.client
  ) {
    args.data = {
      ...args.data,
      client: { connect: { id: accessGrant.clientId } },
    };
  }
}

async function findManyForPageExtensionFn<T>(
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
}
