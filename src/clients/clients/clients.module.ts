import { Module } from '@nestjs/common';
import { AssetsModule } from 'src/assets/assets/assets.module';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { AssetQuestionsModule } from 'src/products/asset-questions/asset-questions.module';
import { ClientsController } from './clients.controller';
import { ClientsScheduler } from './clients.scheduler';
import { ClientsService } from './clients.service';

@Module({
  imports: [KeycloakModule, AssetQuestionsModule, AssetsModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsScheduler],
  exports: [ClientsService],
})
export class ClientsModule {}
