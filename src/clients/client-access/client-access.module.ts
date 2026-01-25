import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ClientAccessController } from './client-access.controller';
import { ClientAccessService } from './client-access.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [ClientAccessController],
  providers: [ClientAccessService],
  exports: [ClientAccessService],
})
export class ClientAccessModule {}
