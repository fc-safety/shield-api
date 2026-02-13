import { Module } from '@nestjs/common';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [InvitationsModule, KeycloakModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
