import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
