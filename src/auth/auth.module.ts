import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({}),
    ClsModule.forRoot({
      middleware: {
        mount: true,
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // TODO: Add PoliciesGuard
    // {
    //   provide: APP_GUARD,
    //   useClass: PoliciesGuard,
    // },
  ],
  exports: [ClsModule],
})
export class AuthModule {}
