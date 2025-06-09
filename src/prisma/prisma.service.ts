import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  PeopleService,
  PersonRepresentation,
  UserConfigurationError,
} from 'src/clients/people/people.service';
import { isNil, ViewContext } from 'src/common/utils';
import {
  Prisma,
  PrismaClient,
  PrismaPromise,
} from 'src/generated/prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { CommonClsStore } from '../common/types';

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
} satisfies ConstructorParameters<typeof PrismaClient>[0];

@Injectable()
export class PrismaService
  extends PrismaClient<typeof DEFAULT_PRISMA_OPTIONS>
  implements OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    protected readonly cls: ClsService<CommonClsStore>,
    private readonly redis: RedisService,
    private readonly peopleService: PeopleService,
  ) {
    super(DEFAULT_PRISMA_OPTIONS);
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

  public extended() {
    return this.$extends(extensions.restExtensions());
  }

  public async forUser() {
    try {
      const person = await this.peopleService.getPersonRepresentation();

      return this.extended().$extends(
        extensions.forUser(person, {
          onResult: ({ model, operation, result }) => {
            this.emitModelEvent({ model, operation, result, person });
          },
        }),
      );
    } catch (e) {
      if (e instanceof UserConfigurationError) {
        throw new ForbiddenException(e.message);
      }
      throw e;
    }
  }

  public async txForUser(
    fn: Parameters<ReturnType<typeof this.extended>['$transaction']>[0],
  ) {
    try {
      const person = await this.peopleService.getPersonRepresentation();

      return await this.collectAndEmitModelEvents(
        async (onResult) => {
          return this.extended()
            .$extends(extensions.setClientContextForUser(person))
            .$extends(extensions.logResult(onResult))
            .$transaction(async (tx) => {
              await Promise.all([
                tx.$executeRaw`SELECT set_config('app.current_client_id', ${person.clientId}, TRUE)`,
                tx.$executeRaw`SELECT set_config('app.current_site_id', ${person.siteId}, TRUE)`,
                tx.$executeRaw`SELECT set_config('app.allowed_site_ids', ${person.allowedSiteIds}, TRUE)`,
                tx.$executeRaw`SELECT set_config('app.current_person_id', ${person.id}, TRUE)`,
                tx.$executeRaw`SELECT set_config('app.current_user_visibility', ${person.visibility}, TRUE)`,
              ]);

              return await fn(tx);
            });
        },
        { person },
      );
    } catch (e) {
      if (e instanceof UserConfigurationError) {
        throw new ForbiddenException(e.message);
      }
      throw e;
    }
  }

  public bypassRLS(options: { skipPersonLog?: boolean } = {}) {
    return this.extended().$extends(
      extensions.bypassRLS({
        onResult: ({ model, operation, result }) => {
          if (options.skipPersonLog) {
            return;
          }

          this.peopleService
            .getPersonRepresentation()
            .catch((e) =>
              this.logger.warn(
                e,
                'Failed to get person representation. This usually happens when called from outside a request cycle.',
              ),
            )
            .then(
              (person) =>
                person &&
                this.emitModelEvent({ model, operation, result, person }),
            )
            .catch((e) => this.logger.warn(e, 'Failed to emit model event.'));
        },
      }),
    );
  }

  public async txBypassRLS(
    fn: Parameters<ReturnType<typeof this.extended>['$transaction']>[0],
    options: { skipPersonLog?: boolean } = {},
  ) {
    return this.collectAndEmitModelEvents(
      async (onResult) => {
        return await this.extended()
          .$extends(extensions.logResult(onResult))
          .$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`;
            return await fn(tx);
          });
      },
      { skipPersonLog: options.skipPersonLog },
    );
  }

  /**
   * Bypasses RLS if user is global admin, otherwise isolates data based on user's client.
   *
   * @returns `this.bypassRLS()` if the user is a global admin, else `await this.forClient()`
   */
  public async forAdminOrUser() {
    const user = this.cls.get('user');
    if (user?.isSuperAdmin()) {
      return this.bypassRLS();
    } else {
      return await this.forUser();
    }
  }

  public async txForAdminOrUser(
    fn: Parameters<ReturnType<typeof this.extended>['$transaction']>[0],
  ) {
    const user = this.cls.get('user');
    if (user?.isSuperAdmin()) {
      return await this.txBypassRLS(fn);
    } else {
      return await this.txForUser(fn);
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

  public async txForContext(
    fn: Parameters<ReturnType<typeof this.extended>['$transaction']>[0],
    _context?: ViewContext,
  ) {
    const context = _context ?? this.cls.get('viewContext');
    if (context === 'admin') {
      return await this.txForAdminOrUser(fn);
    } else {
      return await this.txForUser(fn);
    }
  }

  private async collectAndEmitModelEvents(
    callback: (
      onResult: ({
        model,
        operation,
        result,
      }: {
        model: string;
        operation: string;
        result: unknown;
      }) => void,
    ) => Promise<unknown>,
    options: { skipPersonLog?: boolean; person?: PersonRepresentation } = {},
  ) {
    if (options.skipPersonLog) {
      return callback(() => {});
    }

    let onResult: ({
      model,
      operation,
      result,
    }: {
      model: string;
      operation: string;
      result: unknown;
    }) => void = () => {};
    let personRep: PersonRepresentation | null = options.person ?? null;
    const results: { model: string; operation: string; result: unknown }[] = [];

    if (!personRep) {
      try {
        personRep = await this.peopleService.getPersonRepresentation();
      } catch (e) {
        this.logger.warn(
          e,
          'Failed to get person representation. This usually happens when called from outside a request cycle.',
        );
      }
    }

    if (personRep) {
      onResult = ({ model, operation, result }) => {
        results.push({ model, operation, result });
      };
    }

    const finalResult = await callback(onResult);

    if (personRep && results.length > 0) {
      for (const result of results) {
        try {
          this.emitModelEvent({
            model: result.model,
            operation: result.operation,
            result: result.result,
            person: personRep,
          });
        } catch (e) {
          this.logger.warn(
            e,
            `Failed to emit model event: Model ${result.model} Operation ${result.operation}`,
          );
        }
      }
    }

    return finalResult;
  }

  private emitModelEvent({
    model,
    operation,
    result,
    person,
  }: {
    model: string;
    operation: string;
    result: unknown;
    person: PersonRepresentation;
  }) {
    if (!['create', 'update', 'delete'].includes(operation)) {
      return;
    }

    const eventBody: Record<string, string> = {
      model,
      operation,
    };

    if (typeof result === 'object' && !isNil(result) && 'id' in result) {
      eventBody.id = String(result.id);
    }

    const channel = `db-events:${person.clientId}:${model}:${operation}`;

    this.redis.getPublisher().publish(channel, JSON.stringify(eventBody));
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
}

export const extensions = {
  bypassRLS: (
    options: {
      onResult?: ({
        model,
        operation,
        result,
      }: {
        model: string;
        operation: string;
        result: unknown;
      }) => void;
    } = {},
  ) => {
    return Prisma.defineExtension((prisma) =>
      prisma.$extends({
        client: {
          $viewContext: 'admin' as ViewContext,
        },
        query: {
          $allModels: {
            async $allOperations({ args, query, model, operation }) {
              const [, result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
                query(args),
              ]);

              if (options.onResult) {
                options.onResult({ model, operation, result });
              }

              return result;
            },
          },
        },
      }),
    );
  },

  logResult: (
    onResult: ({
      model,
      operation,
      result,
    }: {
      model: string;
      operation: string;
      result: unknown;
    }) => void,
  ) => {
    return Prisma.defineExtension((prisma) => {
      return prisma.$extends({
        query: {
          $allModels: {
            async $allOperations({ args, query, model, operation }) {
              const result = await query(args);
              if (onResult) {
                onResult({ model, operation, result });
              }
              return result;
            },
          },
        },
      });
    });
  },

  forUser: (
    person: PersonRepresentation,
    options: {
      onResult?: ({
        model,
        operation,
        result,
      }: {
        model: string;
        operation: string;
        result: unknown;
      }) => void;
    } = {},
  ) => {
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
              const result = await setContextAndExecute(query(args));

              // Emit event to Redis.
              if (options.onResult) {
                options.onResult({
                  model,
                  operation,
                  result,
                });
              }

              return result;
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

  setClientContextForUser: (person: PersonRepresentation) => {
    return Prisma.defineExtension((prisma) => {
      return prisma.$extends({
        query: {
          $allModels: {
            async $allOperations({ args, query, model, operation }) {
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

              return query(args);
            },
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
