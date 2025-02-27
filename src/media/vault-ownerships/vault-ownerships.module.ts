import { Module } from '@nestjs/common';
import { VaultOwnershipsService } from './vault-ownerships.service';
import { VaultOwnershipsController } from './vault-ownerships.controller';

@Module({
  controllers: [VaultOwnershipsController],
  providers: [VaultOwnershipsService],
})
export class VaultOwnershipsModule {}
