import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { createClient, type RedisClientType } from 'redis';
import { ApiConfigService } from 'src/config/api-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly subscribedPatterns: Set<string> = new Set();
  private readonly eventManager = new EventEmitter<
    Record<string, [string, string]>
  >();

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

  public async addPatternListener(
    pattern: string,
    listener: (message: string, channel: string) => void,
  ) {
    this.eventManager.on(pattern, listener);

    // Subscribe to Redis pattern if not already subscribed
    if (!this.subscribedPatterns.has(pattern)) {
      this.subscribedPatterns.add(pattern);
      await this.subscriber.pSubscribe(pattern, (message, channel) => {
        this.eventManager.emit(pattern, message, channel);
      });
    }
  }

  public async removePatternListener(
    pattern: string,
    listener: (message: string, channel: string) => void,
  ) {
    this.eventManager.off(pattern, listener);

    // Unsubscribe from Redis pattern if no listeners are registered
    if (this.eventManager.listenerCount(pattern) === 0) {
      this.subscribedPatterns.delete(pattern);
      await this.subscriber.pUnsubscribe(pattern);
    }
  }
}
