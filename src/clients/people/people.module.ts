import { forwardRef, Module } from '@nestjs/common';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { ApiConfigModule } from 'src/config/api-config.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PeopleService } from './people.service';

@Module({
  imports: [forwardRef(() => PrismaModule), KeycloakModule, ApiConfigModule],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
