import { Module } from '@nestjs/common';
import { ClientsModule as ClientsResourceModule } from './clients/clients.module';
import { SitesModule } from './sites/sites.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ClientsResourceModule, SitesModule, UsersModule],
})
export class ClientsModule {}
