import { CacheModule } from '@nestjs/cache-manager';
import { forwardRef, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { ClientsModule } from 'src/clients/clients/clients.module';
import { PeopleModule } from 'src/clients/people/people.module';
import { SitesModule } from 'src/clients/sites/sites.module';
import { ApiClsService } from './api-cls.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
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
          cls.set('isPublic', false);
          cls.set('skipAccessGrantValidation', false);
        },
      },
    }),
    KeycloakModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => PeopleModule),
    forwardRef(() => SitesModule),
  ],
  controllers: [AuthController],
  providers: [
    ApiClsService,
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
  exports: [ClsModule, AuthService, ApiClsService],
})
export class AuthModule {}
