import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { ApiConfigService } from 'src/config/api-config.service';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly subscriber: RedisClientType;

  constructor(private readonly config: ApiConfigService) {
    this.client = createClient({
      socket: {
        host: this.config.get('KV_STORE_HOST'),
        port: this.config.get('KV_STORE_PORT'),
      },
    });
    this.subscriber = this.client.duplicate();
  }

  async onModuleInit() {
    await this.client.connect();
    await this.subscriber.connect();
  }

  public getPublisher() {
    return this.client;
  }

  public getSubscriber() {
    return this.subscriber;
  }
}
