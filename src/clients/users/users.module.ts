import { forwardRef, Module } from '@nestjs/common';
import { RolesModule } from 'src/admin/roles/roles.module';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [KeycloakModule, RolesModule, forwardRef(() => NotificationsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
