import { forwardRef, Global, Module } from '@nestjs/common';
import { PeopleModule } from 'src/clients/people/people.module';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaAdapter } from './prisma.adapter';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [RedisModule, forwardRef(() => PeopleModule)],
  providers: [PrismaService, PrismaAdapter],
  exports: [PrismaService],
})
export class PrismaModule {}
