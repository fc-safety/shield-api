import { Prisma, VaultAccessType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateVaultOwnershipSchema = z.object({
  key: z.string().nonempty(),
  bucketName: z.string().optional(),
  accessType: z
    .enum(
      Object.values(VaultAccessType) as [VaultAccessType, ...VaultAccessType[]],
    )
    .optional(),
}) satisfies z.Schema<Prisma.VaultOwnershipCreateInput>;

export class CreateVaultOwnershipDto extends createZodDto(
  CreateVaultOwnershipSchema,
) {}
