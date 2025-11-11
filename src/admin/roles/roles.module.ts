import { Module } from '@nestjs/common';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { RedisModule } from 'src/redis/redis.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [KeycloakModule, RedisModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
