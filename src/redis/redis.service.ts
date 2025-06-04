import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { ApiConfigService } from 'src/config/api-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly subscriber: RedisClientType;

  constructor(private readonly config: ApiConfigService) {
    this.client = createClient({
      socket: {
        host: this.config.get('KV_STORE_HOST'),
        port: this.config.get('KV_STORE_PORT'),
        connectTimeout: this.config.get('KV_STORE_CONNECT_TIMEOUT'),
      },
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });
    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });
    this.client.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting');
    });
    this.client.on('end', () => {
      this.logger.log('Redis client disconnected');
    });

    this.subscriber = this.client.duplicate();
    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err);
    });
    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });
    this.subscriber.on('ready', () => {
      this.logger.log('Redis subscriber ready');
    });
    this.subscriber.on('reconnecting', () => {
      this.logger.log('Redis subscriber reconnecting');
    });
    this.subscriber.on('end', () => {
      this.logger.log('Redis subscriber disconnected');
    });
  }

  async onModuleInit() {
    await this.client.connect();
    await this.subscriber.connect();
  }

  async onModuleDestroy() {
    this.client.destroy();
    this.subscriber.destroy();
  }

  public getPublisher() {
    return this.client;
  }

  public getSubscriber() {
    return this.subscriber;
  }
}
