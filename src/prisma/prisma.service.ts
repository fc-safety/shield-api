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

      // this.logger.debug(`Query: ${e.query}`, {
      //   model,
      //   action,
      //   params: e.params,
      //   duration: `${e.duration}ms`,
      // });
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
