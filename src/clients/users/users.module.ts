import { Module } from '@nestjs/common';
import { RolesModule } from 'src/admin/roles/roles.module';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [KeycloakModule, RolesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
