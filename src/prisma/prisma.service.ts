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

  public async forUser() {
    return this.build({ context: 'user' });
  }

  public bypassRLS() {
    return this.$extends(this.buildBypassRLSExtension());
  }

  public async forContext(_context?: ViewContext) {
    return this.build({ context: _context });
  }

  public async build(options: PrimaryExtensionOptions = {}) {
    return this.$extends(await this.buildPrimaryExtension(options));
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

    const channel = `db-events:${person.clientId}:${model}:${cleanedOperation}`;

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

  private buildBypassRLSExtension() {
    return Prisma.defineExtension((prisma) => {
      const setRLSContextAndExecute = async <P extends PrismaPromise<any>>(
        transactionArg: P,
      ) => {
        const rlsContextStatements = buildRLSContextStatements(prisma, true);
        const statementResults = await prisma.$transaction([
          ...rlsContextStatements,
          transactionArg,
        ]);
        return statementResults[statementResults.length - 1];
      };

      return prisma.$extends({
        client: {
          $viewContext: 'admin',
          $transaction: async (
            ...args: Parameters<typeof prisma.$transaction>
          ) => {
            const [fn, ...rest] = args;
            return await prisma.$transaction(
              async (tx) => {
                await Promise.all(buildRLSContextStatements(tx, true));
                return await fn(tx);
              },
              ...rest,
            );
          },
        },
        model: {
          $allModels: {
            findManyForPage: findManyForPageExtensionFn,
          },
        },
        query: {
          $allModels: {
            async $allOperations({ args, query, operation, model }) {
              return setRLSContextAndExecute(query(args));
            },
          },
          $queryRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $queryRawTyped: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $queryRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $executeRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $executeRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
        },
      });
    });
  }

  private async buildPrimaryExtension(options: PrimaryExtensionOptions) {
    const user = this.cls.get('user');
    const context = options.context ?? this.cls.get('viewContext');
    const isSuperAdmin = !!user?.isSuperAdmin();
    const shouldBypassRLS = isSuperAdmin && context === 'admin';

    let person: PersonRepresentation;
    if (options.person) {
      person = options.person;
    } else {
      try {
        person = await this.peopleService.getPersonRepresentation();
      } catch (e) {
        if (e instanceof UserConfigurationError) {
          throw new ForbiddenException(e.message);
        }
        throw e;
      }
    }

    const thisPrismaService = this;

    return Prisma.defineExtension((prisma) => {
      const setRLSContextAndExecute = async <P extends PrismaPromise<any>>(
        transactionArg: P,
      ) => {
        const rlsContextStatements = buildRLSContextStatements(
          prisma,
          shouldBypassRLS,
          person,
        );
        const statementResults = await prisma.$transaction([
          ...rlsContextStatements,
          transactionArg,
        ]);
        return statementResults[statementResults.length - 1];
      };

      const extendedPrisma = prisma.$extends({
        client: {
          $currentUser: () => person,
          $viewContext: context,
        },
        model: {
          $allModels: {
            findManyForPage: findManyForPageExtensionFn,
          },
        },
        query: {
          $allModels: {
            async $allOperations({ args, query, operation, model }) {
              if (!shouldBypassRLS) {
                setModelClientOwnershipForPerson(
                  args,
                  model,
                  operation,
                  person,
                );
              }

              const result = await setRLSContextAndExecute(query(args));

              // Emit event to Redis.
              thisPrismaService.emitModelEvent({
                model,
                operation,
                result,
                person,
              });

              return result;
            },
          },
          $queryRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $queryRawTyped: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $queryRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $executeRaw: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
          $executeRawUnsafe: ({ args, query }) => {
            return setRLSContextAndExecute(query(args));
          },
        },
      });

      return extendedPrisma.$extends({
        client: {
          $transaction: async (
            ...args: Parameters<typeof extendedPrisma.$transaction>
          ) => {
            const [fn, ...rest] = args;
            return await extendedPrisma.$transaction(
              async (tx) => {
                await Promise.all(
                  buildRLSContextStatements(tx, shouldBypassRLS, person),
                );
                return await fn(tx);
              },
              ...rest,
            );
          },
        },
      });
    });
  }
}

export interface PrimaryExtensionOptions {
  context?: ViewContext;
  person?: PersonRepresentation;
}

function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: true,
): PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: false,
  person: PersonRepresentation,
): PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: boolean,
  person?: PersonRepresentation,
): PrismaPromise<any>[];
function buildRLSContextStatements(
  prismaClient: Pick<PrismaClient, '$executeRaw'>,
  shouldBypassRLS: boolean,
  person?: PersonRepresentation,
) {
  if (shouldBypassRLS) {
    return [
      prismaClient.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
    ];
  }

  if (!person) {
    throw new Error('Person is required when RLS is not bypassed');
  }

  return [
    prismaClient.$executeRaw`SELECT set_config('app.current_client_id', ${person.clientId}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_site_id', ${person.siteId}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.allowed_site_ids', ${person.allowedSiteIds}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_person_id', ${person.id}, TRUE)`,
    prismaClient.$executeRaw`SELECT set_config('app.current_user_visibility', ${person.visibility}, TRUE)`,
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
function setModelClientOwnershipForPerson<T>(
  args: Prisma.Args<T, 'create' | 'update'>,
  model: string,
  operation: string,
  person: PersonRepresentation,
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
      client: { connect: { id: person.clientId } },
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
