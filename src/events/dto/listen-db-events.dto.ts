import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const SUPPORTED_MODELS = [
  'Manufacturer',
  'ProductCategory',
  'Product',
  'Asset',
  'Alert',
  'Inspection',
  'InspectionRoute',
  'ProductRequest',
] as const satisfies Prisma.ModelName[];

export const ListenDbEventsSchema = z.object({
  token: z.string(),
  models: z.enum(SUPPORTED_MODELS).array(),
  operations: z.enum(['create', 'update', 'delete']).array().optional(),
  ids: z.string().array().optional(),
});

export class ListenDbEventsDto extends createZodDto(ListenDbEventsSchema) {}
