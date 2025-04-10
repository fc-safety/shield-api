import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { z } from 'zod';
import { CreateSiteSchema } from './create-site.dto';

const UpdateSiteSchema = CreateSiteSchema.partial()
  .omit({ address: true, subsites: true })
  .extend({
    address: z.object({
      update: createAddressSchema.partial(),
    }),
    subsites: z.object({
      set: z.array(z.object({ id: z.string() })),
    }),
  })
  .partial() satisfies z.Schema<Prisma.SiteUpdateInput>;

export class UpdateSiteDto extends createZodDto(UpdateSiteSchema) {}
