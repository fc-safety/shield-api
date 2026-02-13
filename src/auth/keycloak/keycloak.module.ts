import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/config/api-config.service';
import { KeycloakAccessSyncService } from './keycloak-access-sync.service';
import { KeycloakWebhookController } from './keycloak-webhook.controller';
import {
  KEYCLOAK_ADMIN_CLIENT,
  keycloakAdminClientFactory,
  KeycloakService,
} from './keycloak.service';

@Module({
  // PrismaModule is @Global() so no need to import it explicitly
  controllers: [KeycloakWebhookController],
  providers: [
    {
      provide: KEYCLOAK_ADMIN_CLIENT,
      useFactory: (config: ApiConfigService) =>
        keycloakAdminClientFactory(config),
      inject: [ApiConfigService],
    },
    KeycloakService,
    KeycloakAccessSyncService,
  ],
  exports: [KeycloakService],
})
export class KeycloakModule {}
