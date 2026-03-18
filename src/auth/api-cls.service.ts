import { Injectable } from '@nestjs/common';
import { type ClsStore, ClsService } from 'nestjs-cls';
import {
  AccessContextKind,
  ResolvedAccessContext,
} from 'src/auth/access-context.types';
import { TAccessGrant } from 'src/auth/auth.types';
import { StatelessUser } from 'src/auth/user.schema';
import { AccessIntent } from 'src/common/utils';
import { Prisma } from 'src/generated/prisma/client';

export interface CommonClsStore extends ClsStore {
  isPublic: boolean;
  skipAccessGrantValidation: boolean;
  user?: StatelessUser;
  person?: Prisma.PersonGetPayload<object>;
  accessGrant?: TAccessGrant;
  accessIntent?: AccessIntent;
  accessContext?: ResolvedAccessContext;
  useragent?: string;
  ipv4?: string;
  ipv6?: string;
  mode?: 'cron' | 'request';
}

@Injectable()
export class ApiClsService {
  constructor(private readonly cls: ClsService<CommonClsStore>) {}

  private getAuthenticatedAccessContext() {
    const accessContext = this.get('accessContext');
    if (!accessContext || accessContext.kind === 'public') {
      return null;
    }
    return accessContext;
  }

  public get<K extends keyof CommonClsStore>(
    key: K,
  ): CommonClsStore[K] | undefined {
    return this.cls.get(key);
  }

  public set<K extends keyof CommonClsStore>(key: K, value: CommonClsStore[K]) {
    this.cls.set(key, value);
  }

  public requireAccessGrant() {
    const accessContext = this.getAuthenticatedAccessContext();
    const accessGrant =
      accessContext?.authorization.accessGrant ?? this.get('accessGrant');
    if (!accessGrant) {
      throw new Error(
        'Access grant was required but not found in CLS context.',
      );
    }
    return accessGrant;
  }

  public requireUser() {
    const accessContext = this.getAuthenticatedAccessContext();
    const user = accessContext?.actor.user;
    if (!user) {
      // TODO: Remove legacy fallback once all callers use accessContext.
      const legacyUser = this.get('user');
      if (legacyUser) {
        return legacyUser;
      }
      throw new Error('User was required but not found in CLS context.');
    }
    return user;
  }

  public requirePerson() {
    const accessContext = this.getAuthenticatedAccessContext();
    const person = accessContext?.actor.person;
    if (!person) {
      // TODO: Remove legacy fallback once all callers use accessContext.
      const legacyPerson = this.get('person');
      if (legacyPerson) {
        return legacyPerson;
      }
      throw new Error('Person was required but not found in CLS context.');
    }
    return person;
  }

  public requireAccessContext() {
    const accessContext = this.get('accessContext');
    if (!accessContext) {
      throw new Error('Access context was required but not found in CLS context.');
    }
    return accessContext;
  }

  public get accessContextKind(): AccessContextKind {
    return this.get('accessContext')?.kind ?? 'public';
  }

  public get accessIntent() {
    return this.get('accessIntent') ?? 'user';
  }
}
