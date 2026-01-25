import { Module } from '@nestjs/common';
import { DbRolesController } from './db-roles.controller';
import { DbRolesService } from './db-roles.service';

@Module({
  controllers: [DbRolesController],
  providers: [DbRolesService],
  exports: [DbRolesService],
})
export class DbRolesModule {}
