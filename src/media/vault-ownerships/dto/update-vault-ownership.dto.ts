import { createZodDto } from 'nestjs-zod';
import { CreateVaultOwnershipSchema } from './create-vault-ownership.dto';

export class UpdateVaultOwnershipDto extends createZodDto(
  CreateVaultOwnershipSchema.partial(),
) {}
