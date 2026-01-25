import { Module } from '@nestjs/common';
import { ClientAccessController } from './client-access.controller';
import { ClientAccessService } from './client-access.service';

@Module({
  controllers: [ClientAccessController],
  providers: [ClientAccessService],
  exports: [ClientAccessService],
})
export class ClientAccessModule {}
