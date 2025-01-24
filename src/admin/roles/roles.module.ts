import { Module } from '@nestjs/common';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [KeycloakModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
