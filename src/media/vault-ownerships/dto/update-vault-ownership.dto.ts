import { PartialType } from '@nestjs/swagger';
import { CreateVaultOwnershipDto } from './create-vault-ownership.dto';

export class UpdateVaultOwnershipDto extends PartialType(CreateVaultOwnershipDto) {}
