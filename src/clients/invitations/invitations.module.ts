import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [CacheModule.register(), ClientsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
