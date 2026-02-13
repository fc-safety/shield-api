import { Global, Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaAdapter } from './prisma.adapter';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [PrismaService, PrismaAdapter],
  exports: [PrismaService],
})
export class PrismaModule {}
