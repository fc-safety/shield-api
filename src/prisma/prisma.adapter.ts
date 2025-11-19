import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ApiConfigService } from 'src/config/api-config.service';

@Injectable()
export class PrismaAdapter extends PrismaPg {
  constructor(private readonly apiConfig: ApiConfigService) {
    super({
      connectionString: apiConfig.get('DATABASE_URL'),
    });
  }
}
