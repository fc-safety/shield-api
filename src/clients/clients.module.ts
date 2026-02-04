import { Module } from '@nestjs/common';
import { ClientAccessModule } from './client-access/client-access.module';
import { ClientsModule as ClientsResourceModule } from './clients/clients.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PeopleModule } from './people/people.module';
import { SitesModule } from './sites/sites.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ClientAccessModule,
    ClientsResourceModule,
    InvitationsModule,
    PeopleModule,
    SitesModule,
    UsersModule,
  ],
})
export class ClientsModule {}
