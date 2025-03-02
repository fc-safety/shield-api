import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { z } from 'zod';

export const CreateSiteSchema = z.object({
  externalId: z.string().optional(),
  name: z.string(),
  client: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  parentSite: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  address: z.object({
    create: createAddressSchema,
  }),
  primary: z.boolean().optional(),
  phoneNumber: z.string(),
  subsites: z
    .object({
      connect: z.array(z.object({ id: z.string() })),
    })
    .optional(),
}) satisfies z.Schema<Prisma.SiteCreateInput>;

export class CreateSiteDto extends createZodDto(CreateSiteSchema) {}
