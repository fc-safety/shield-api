import { Module } from '@nestjs/common';
import { DbRolesModule } from './db-roles/db-roles.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [DbRolesModule, RolesModule],
})
export class AdminModule {}
