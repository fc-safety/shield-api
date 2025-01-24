import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { AuthGuard } from './auth.guard';
import { PoliciesGuard } from './policies.guard';
import { KeycloakModule } from './keycloak/keycloak.module';

@Global()
@Module({
  imports: [
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
  ],
  exports: [ClsModule],
})
export class AuthModule {}
