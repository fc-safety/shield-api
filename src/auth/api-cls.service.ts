import { Injectable } from '@nestjs/common';
import { type ClsStore, ClsService } from 'nestjs-cls';
import { TAccessGrant } from 'src/auth/auth.types';
import { StatelessUser } from 'src/auth/user.schema';
import { ViewContext } from 'src/common/utils';
import { Prisma } from 'src/generated/prisma/client';

export interface CommonClsStore extends ClsStore {
  isPublic: boolean;
  skipAccessGrantValidation: boolean;
  user?: StatelessUser;
  person?: Prisma.PersonGetPayload<object>;
  accessGrant?: TAccessGrant;
  viewContext?: ViewContext;
  useragent?: string;
  ipv4?: string;
  ipv6?: string;
  mode?: 'cron' | 'request';
}

@Injectable()
export class ApiClsService {
  constructor(private readonly cls: ClsService<CommonClsStore>) {}

  public get<K extends keyof CommonClsStore>(
    key: K,
  ): CommonClsStore[K] | undefined {
    return this.cls.get(key);
  }

  public set<K extends keyof CommonClsStore>(key: K, value: CommonClsStore[K]) {
    this.cls.set(key, value);
  }

  public requireAccessGrant() {
    const accessGrant = this.get('accessGrant');
    if (!accessGrant) {
      throw new Error(
        'Access grant was required but not found in CLS context.',
      );
    }
    return accessGrant;
  }

  public requireUser() {
    const user = this.get('user');
    if (!user) {
      throw new Error('User was required but not found in CLS context.');
    }
    return user;
  }

  public requirePerson() {
    const person = this.get('person');
    if (!person) {
      throw new Error('Person was required but not found in CLS context.');
    }
    return person;
  }

  public get viewContext() {
    return this.get('viewContext') ?? 'user';
  }
}
