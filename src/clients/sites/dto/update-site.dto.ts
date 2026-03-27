import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateSiteSchema } from './create-site.dto';

const UpdateSiteSchema = CreateSiteSchema.partial()
  .omit({ address: true, subsites: true })
  .extend({
    active: z.boolean(),
    address: z.object({
      update: createAddressSchema.partial(),
    }),
    subsites: z.object({
      set: z.array(z.object({ id: z.string() })).min(1),
    }),
    parentSite: z
      .object({
        connect: z.object({
          id: z.string(),
        }),
        disconnect: z.boolean(),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.SiteUpdateInput>;

export class UpdateSiteDto extends createZodDto(UpdateSiteSchema) {}
