import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  Prisma,
  SettingsBlock as PrismaSettingsBlock,
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { z } from 'zod';
import { GLOBAL_SETTINGS_FRIENDLY_ID } from './constants';
import {
  DEFAULT_GLOBAL_SETTINGS,
  GlobalSettingsDto,
  GlobalSettingsSchema,
} from './dto/global-settings.dto';

export interface SettingsBlock<T extends PrismaSettingsBlock['data']>
  extends PrismaSettingsBlock {
  data: T;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getGlobalSettings() {
    return this.getOrCreateSettingsBlock<z.infer<typeof GlobalSettingsSchema>>(
      GLOBAL_SETTINGS_FRIENDLY_ID,
      DEFAULT_GLOBAL_SETTINGS,
      {
        cache: true,
      },
    );
  }

  async updateGlobalSettings(globalSettingsDto: GlobalSettingsDto) {
    return this.updateSettingsBlock(
      GLOBAL_SETTINGS_FRIENDLY_ID,
      {
        ...globalSettingsDto,
      },
      {
        cache: true,
      },
    );
  }

  private async getOrCreateSettingsBlock<
    T extends Prisma.SettingsBlockGetPayload<null>['data'],
  >(
    friendlyId: string,
    defaultData: Prisma.SettingsBlockCreateInput['data'],
    options: {
      cache?: boolean;
    } = {},
  ): Promise<SettingsBlock<T>> {
    const { cache = false } = options;
    const cacheKey = `settings-block:${friendlyId}`;

    let settings: SettingsBlock<T> | null = null;
    if (cache) {
      settings = await this.cache.get<SettingsBlock<T>>(cacheKey);
    }

    if (settings) {
      if (
        this.isNullOrObject(settings.data) &&
        this.isNullOrObject(defaultData) &&
        !this.shouldUpdateDefaultValues(settings.data, defaultData)
      ) {
        return settings;
      }
    }

    return this.prisma.settingsBlock
      .findUnique({
        where: {
          friendlyId,
        },
      })
      .then((settings) => {
        if (settings) {
          if (
            this.isNullOrObject(settings.data) &&
            this.isNullOrObject(defaultData) &&
            this.shouldUpdateDefaultValues(settings.data, defaultData)
          ) {
            return this.prisma.settingsBlock.update({
              where: {
                friendlyId,
              },
              data: {
                data: {
                  ...(settings.data ?? {}),
                  ...defaultData,
                },
              },
            });
          } else {
            return settings;
          }
        }

        return this.prisma.settingsBlock.create({
          data: {
            friendlyId,
            data: defaultData,
          },
        });
      })
      .then(async (settings) => {
        if (cache) {
          await this.cache.set(cacheKey, settings);
        }
        return settings as SettingsBlock<T>;
      });
  }

  private async updateSettingsBlock(
    friendlyId: string,
    data: Prisma.SettingsBlockUpdateInput['data'],
    options: {
      cache?: boolean;
    } = {},
  ) {
    const { cache = false } = options;
    const cacheKey = `settings-block:${friendlyId}`;

    return this.prisma.settingsBlock
      .update({
        where: {
          friendlyId,
        },
        data: {
          data,
        },
      })
      .then(async (settings) => {
        if (cache) {
          await this.cache.set(cacheKey, settings);
        }
        return settings;
      });
  }

  private isNullOrObject(value: unknown): value is object | null {
    return typeof value === 'object' || value === null;
  }

  private shouldUpdateDefaultValues(
    settingsData: object | null,
    defaultData: object | null,
  ): defaultData is NonNullable<object> {
    if (defaultData === null) {
      return false;
    }

    if (settingsData === null) {
      return true;
    }

    const existingKeys = Object.keys(settingsData);
    const defaultKeys = Object.keys(defaultData);

    return defaultKeys.some((key) => !existingKeys.includes(key));
  }
}
