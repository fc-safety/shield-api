import { Module } from '@nestjs/common';
import { RolesModule } from 'src/admin/roles/roles.module';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [UsersModule, RolesModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
