import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [CacheModule.register()],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
