import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { DbRolesController } from './db-roles.controller';
import { DbRolesService } from './db-roles.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [DbRolesController],
  providers: [DbRolesService],
  exports: [DbRolesService],
})
export class DbRolesModule {}
