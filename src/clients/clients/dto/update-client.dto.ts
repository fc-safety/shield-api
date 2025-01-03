import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { z } from 'zod';
import { CreateClientSchema } from './create-client.dto';

export const UpdateClientSchema = CreateClientSchema.omit({
  externalId: true,
  address: true,
})
  .extend({
    address: z.object({
      update: createAddressSchema.partial(),
    }),
  })
  .partial();

export class UpdateClientDto extends createZodDto(UpdateClientSchema) {}
