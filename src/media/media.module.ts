import { Module } from '@nestjs/common';
import { VaultOwnershipsModule } from './vault-ownerships/vault-ownerships.module';

@Module({
  imports: [VaultOwnershipsModule]
})
export class MediaModule {}
