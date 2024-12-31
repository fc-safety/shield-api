import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { configSchema } from './config';
import { ApiConfigModule } from './config/api-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (env) => configSchema.parse(env),
    }),
    ApiConfigModule,
    AuthModule,
    PrismaModule,
    AssetsModule,
    ProductsModule,
    ClientsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
