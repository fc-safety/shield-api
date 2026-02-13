import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { MemoryCacheService } from './memory-cache.service';

@Global()
@Module({
  imports: [NestCacheModule.register()],
  providers: [MemoryCacheService],
  exports: [MemoryCacheService],
})
export class CacheModule {}
