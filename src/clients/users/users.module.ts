import { forwardRef, Module } from '@nestjs/common';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [KeycloakModule, forwardRef(() => NotificationsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
