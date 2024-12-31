import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly config: ConfigService<Config, true>) {}

  get<T extends keyof Config>(key: T) {
    return this.config.get(key, { infer: true });
  }
}
