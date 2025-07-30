import { Module } from '@nestjs/common';
import { RolesModule } from 'src/admin/roles/roles.module';
import { AssetsModule } from 'src/assets/assets/assets.module';
import { KeycloakModule } from 'src/auth/keycloak/keycloak.module';
import { AssetQuestionsModule } from 'src/products/asset-questions/asset-questions.module';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    KeycloakModule,
    AssetQuestionsModule,
    AssetsModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
