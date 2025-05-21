import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
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
      },
    }),
    KeycloakModule,
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
    AuthService,
  ],
  exports: [ClsModule, AuthService],
})
export class AuthModule {}
