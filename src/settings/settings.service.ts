import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import { z } from 'zod';
import { GLOBAL_SETTINGS_FRIENDLY_ID } from './constants';
import {
  DEFAULT_GLOBAL_SETTINGS,
  GlobalSettingsDto,
  GlobalSettingsSchema,
} from './dto/global-settings.dto';

export interface SettingsBlock<
  T extends Prisma.SettingsBlockGetPayload<null>['data'],
> extends Prisma.SettingsBlockGetPayload<null> {
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

    let settings: SettingsBlock<T> | undefined = undefined;
    if (cache) {
      settings = await this.cache.get<SettingsBlock<T>>(cacheKey);
    }

    if (settings) {
      return settings;
    }

    return this.prisma.settingsBlock
      .findUnique({
        where: {
          friendlyId,
        },
      })
      .then((settings) =>
        settings
          ? settings
          : this.prisma.settingsBlock.create({
              data: {
                friendlyId,
                data: defaultData,
              },
            }),
      )
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
}
