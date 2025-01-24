import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/config/api-config.service';
import {
  KEYCLOAK_ADMIN_CLIENT,
  keycloakAdminClientFactory,
  KeycloakService,
} from './keycloak.service';

@Module({
  providers: [
    {
      provide: KEYCLOAK_ADMIN_CLIENT,
      useFactory: (config: ApiConfigService) =>
        keycloakAdminClientFactory(config),
      inject: [ApiConfigService],
    },
    KeycloakService,
  ],
  exports: [KeycloakService],
})
export class KeycloakModule {}
