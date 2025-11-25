import { CacheModule } from '@nestjs/cache-manager';
import { forwardRef, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { ClientsModule } from 'src/clients/clients/clients.module';
import { ActiveClientGuard } from 'src/clients/guards/active-client.guard';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { KeycloakModule } from './keycloak/keycloak.module';
import { PoliciesGuard } from './policies.guard';

@Global()
@Module({
  imports: [
    CacheModule.register(),
    JwtModule.register({}),
    ClsModule.forRoot({
      middleware: {
        mount: true,
        setup: (cls, req) => {
          if (req) {
            cls.set('mode', 'request');
          }
        },
      },
    }),
    KeycloakModule,
    forwardRef(() => ClientsModule),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ActiveClientGuard,
    },
    AuthService,
  ],
  exports: [ClsModule, AuthService],
})
export class AuthModule {}
