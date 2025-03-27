import { createZodDto } from 'nestjs-zod';
import { CustomQueryFilter } from 'src/auth/keycloak/types';
import { buildFixedQuerySchema, PrismaOrderEmum } from 'src/common/validation';
import { z } from 'zod';

const QueryUserFiltersSchema = z
  .object({
    id: z.union([z.string(), z.array(z.string())]),
    siteExternalId: z.string(),
    clientExternalId: z.string(),
  })
  .partial();

const QueryUserOrderSchema = z
  .object({
    firstName: PrismaOrderEmum,
    lastName: PrismaOrderEmum,
    email: PrismaOrderEmum,
    site_id: PrismaOrderEmum,
  })
  .partial();

export class QueryUserDto extends createZodDto(
  QueryUserFiltersSchema.extend(buildFixedQuerySchema(QueryUserOrderSchema)),
) {}

export function getOrderForKeycloak(query: QueryUserDto): string {
  if (!query.order) return '';
  const orders: string[] = [];
  for (const key in query.order) {
    if (query[key]) {
      orders.push(`${query[key] === 'desc' ? '-' : ''}${key}`);
    }
  }
  return orders.join(',');
}

export function asFilterConditions(query: QueryUserDto) {
  const qs: CustomQueryFilter[] = [];

  if (query.siteExternalId) {
    qs.push({
      q: { key: 'site_id', value: query.siteExternalId },
    });
  }

  if (query.clientExternalId) {
    qs.push({
      q: { key: 'client_id', value: query.clientExternalId },
    });
  }

  if (query.id) {
    qs.push({
      q: {
        key: 'user_id',
        value: query.id,
        op: Array.isArray(query.id) ? 'in' : 'eq',
      },
    });
  }

  return qs;
}
