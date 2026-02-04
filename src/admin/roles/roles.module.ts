import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [CacheModule.register()],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
