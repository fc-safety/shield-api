import { AccessIntent } from 'src/common/utils';
import { Prisma } from 'src/generated/prisma/client';
import { TAccessGrant } from './auth.types';
import { StatelessUser } from './user.schema';

export type AccessContextKind = 'public' | 'tenant' | 'support' | 'system';

export interface AccessContextActor {
  user: StatelessUser;
  person: Prisma.PersonGetPayload<object>;
}

export interface AccessContextTenant {
  clientId: string;
  siteId: string;
}

export interface AccessContextAuthorization {
  accessGrant: TAccessGrant;
  accessIntent: AccessIntent;
}

export type PublicAccessContext = {
  kind: 'public';
};

export type TenantAccessContext = {
  kind: 'tenant';
  actor: AccessContextActor;
  tenant: AccessContextTenant;
  authorization: AccessContextAuthorization;
};

export type SupportAccessContext = {
  kind: 'support';
  actor: AccessContextActor;
  tenant: AccessContextTenant;
  authorization: AccessContextAuthorization;
};

export type SystemAccessContext = {
  kind: 'system';
  actor: AccessContextActor;
  authorization: AccessContextAuthorization;
};

export type ResolvedAccessContext =
  | PublicAccessContext
  | TenantAccessContext
  | SupportAccessContext
  | SystemAccessContext;
