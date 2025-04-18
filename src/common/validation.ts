import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export type PrismaQueryFilters<T extends { where?: any; orderBy?: any }> =
  T['where'] & {
    order?: T['orderBy'];
  };

const buildPrismaBoolFilters = <T extends z.ZodTypeAny>(zodType: T) =>
  z.object({
    equals: zodType,
  });

export const prismaBoolFilter = <TValue extends z.ZodBoolean>(
  zodType: TValue,
) => {
  return z.union([zodType, buildPrismaBoolFilters<TValue>(zodType).partial()]);
};

const buildPrismaEnumFilters = <T extends z.ZodTypeAny>(zodType: T) =>
  buildPrismaBoolFilters<T>(zodType).extend({
    in: z.array(zodType),
    notIn: z.array(zodType),
  });

export const prismaEnumFilter = <
  TEnum extends [string, ...string[]],
  TValue extends z.ZodEnum<TEnum>,
>(
  zodType: TValue,
) => {
  return z.union([zodType, buildPrismaEnumFilters<TValue>(zodType).partial()]);
};

const buildPrismaDateTimeFilters = <T extends z.ZodTypeAny>(zodType: T) =>
  buildPrismaEnumFilters<T>(zodType).extend({
    lt: zodType,
    lte: zodType,
    gt: zodType,
    gte: zodType,
  });

export const prismaDateTimeFilter = <TValue extends z.ZodDate>(
  zodType: TValue,
) => {
  return z.union([
    zodType,
    buildPrismaDateTimeFilters<TValue>(zodType).partial(),
  ]);
};

const buildNumberFilters = <T extends z.ZodTypeAny>(zodType: T) =>
  buildPrismaDateTimeFilters<T>(zodType);

export const prismaNumberFilter = <TValue extends z.ZodNumber>(
  zodType: TValue,
) => z.union([zodType, buildNumberFilters<TValue>(zodType).partial()]);

const buildPrismaStringFilters = <T extends z.ZodTypeAny>(zodType: T) =>
  buildPrismaDateTimeFilters<T>(zodType).extend({
    contains: zodType,
    startsWith: zodType,
    endsWith: zodType,
  });

export const prismaStringFilter = <TValue extends z.ZodString>(
  zodType: TValue,
  singularType?: z.ZodTypeAny,
) => {
  return z.union([
    (singularType ?? zodType).transform((value) =>
      value === '_NULL' ? null : value,
    ),
    buildPrismaStringFilters<TValue>(zodType).partial(),
  ]);
};

export const OrderValueOptions = ['asc', 'desc'] as const;
export const PrismaOrderEmum = z.enum(['asc', 'desc']);
export type TOrderValueOption = (typeof OrderValueOptions)[number];

export type TPrismaOrder<T> = {
  [key in keyof T]?: TPrismaOrder<T[key]> | TOrderValueOption;
};

export const buildFixedQuerySchema = <T>(
  orderSchema: z.Schema<Prisma.Args<T, 'findMany'>['orderBy']>,
) => ({
  order: z.union([orderSchema, z.array(orderSchema)]).optional(),
  limit: z.coerce.number().default(10),
  offset: z.coerce.number().default(0),
});

export const buildPrismaFindArgs = <T>(
  querySchema:
    | (Prisma.Args<T, 'findMany'>['where'] & {
        order?: Prisma.Args<T, 'findMany'>['orderBy'];
        limit?: number;
        offset?: number;
      })
    | undefined,
  args?: Prisma.Args<T, 'findMany'>,
): typeof querySchema extends undefined
  ? undefined
  : Prisma.Args<T, 'findMany'> => {
  if (querySchema === undefined) {
    return undefined as any;
  }

  const { order, limit, offset, ...where } = querySchema;
  return {
    ...(args ?? {}),
    where: {
      ...where,
      ...(args?.where ?? {}),
    },
    orderBy: order,
    take: limit,
    skip: offset,
  } as any;
};

export const emptyAsObject = <T extends z.ZodTypeAny>(zodType: T) =>
  z.preprocess((data) => {
    if (data === undefined || data === '') {
      return {};
    }
    return data;
  }, zodType);
