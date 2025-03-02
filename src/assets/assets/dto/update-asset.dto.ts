import { createZodDto } from 'nestjs-zod';
import { CreateAssetSchema } from './create-asset.dto';

export class UpdateAssetDto extends createZodDto(CreateAssetSchema.partial()) {}
