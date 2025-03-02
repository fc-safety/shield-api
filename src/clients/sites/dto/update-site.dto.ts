import { createZodDto } from 'nestjs-zod';
import { CreateSiteSchema } from './create-site.dto';

export class UpdateSiteDto extends createZodDto(CreateSiteSchema.partial()) {}
