import { AccessIntent } from 'src/common/utils';
import { TCapability } from './capabilities';
import { isScopeAtLeast, RoleScope, TScope } from './scope';

interface IAccessGrantData {
  scope: TScope;
  capabilities: TCapability[];
  clientId: string;
  siteId: string;
}

class AccessGrant {
  public readonly scope: TScope;
  public readonly capabilities: TCapability[];
  public readonly clientId: string;
  public readonly siteId: string;

  constructor(input: IAccessGrantData) {
    this.scope = input.scope;
    this.capabilities = input.capabilities;
    this.clientId = input.clientId;
    this.siteId = input.siteId;
  }

  public get data(): IAccessGrantData {
    return {
      scope: this.scope,
      capabilities: this.capabilities,
      clientId: this.clientId,
      siteId: this.siteId,
    };
  }

  /**
   * Check if this grant has SYSTEM scope (system admin access).
   */
  public isSystemAdmin(): boolean {
    return this.scope === RoleScope.SYSTEM || this.scope === RoleScope.GLOBAL;
  }

  /**
   * Check if this grant has at least GLOBAL scope (can access all clients).
   */
  public isGlobalAdmin(): boolean {
    return isScopeAtLeast(this.scope, RoleScope.GLOBAL);
  }

  /**
   * Check if this grant has at least CLIENT scope (can access all sites in their client).
   */
  public isClientAdmin(): boolean {
    return isScopeAtLeast(this.scope, RoleScope.CLIENT);
  }

  /**
   * Check if this grant's scope is at least as permissive as the required scope.
   *
   * @example
   * user.scopeAllows(RoleScope.CLIENT) // true if user has CLIENT, GLOBAL, or SYSTEM scope
   */
  public scopeAllows(required: TScope): boolean {
    return isScopeAtLeast(this.scope, required);
  }

  /**
   * Check if this grant has a specific capability.
   */
  public hasCapability(capability: TCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if this grant has any of the specified capabilities.
   */
  public hasAnyCapability(capabilities: TCapability[]): boolean {
    return capabilities.some((c) => this.capabilities.includes(c));
  }

  /**
   * Check if this grant has all of the specified capabilities.
   */
  public hasAllCapabilities(capabilities: TCapability[]): boolean {
    return capabilities.every((c) => this.capabilities.includes(c));
  }
}

interface IAccessGrantResultDetails {
  requestedClientId?: string | null;
  requestedSiteId?: string | null;
  primaryClientId?: string | null;
  primarySiteId?: string | null;
  primaryRoleId?: string | null;
  // TODO: Add access expiration support.
  expiredOn?: Date | null;
}

type TAccessGrantResult =
  | {
      grant: IAccessGrantData;
      reason?: never;
      message?: never;
      details?: never;
    }
  | {
      grant?: never;
      reason:
        | 'no_access_grant'
        | 'access_grant_expired'
        | 'access_grant_request_denied'
        | 'client_inactive'
        | 'site_inactive';
      message: string;
      details: IAccessGrantResultDetails;
    };

const reduceAccessGrants = (
  accessGrants: (AccessGrant | IAccessGrantData)[],
): AccessGrant => {
  if (accessGrants.length === 0) {
    throw new Error('No access grants provided');
  }

  let clientId = accessGrants[0].clientId;
  let siteId = accessGrants[0].siteId;
  let mostPermissiveScope: TScope = RoleScope.SELF;
  const combinedCapabilities = new Set<TCapability>();

  for (const accessGrant of accessGrants) {
    if (isScopeAtLeast(accessGrant.scope, mostPermissiveScope)) {
      mostPermissiveScope = accessGrant.scope;

      // Use client and site IDs from role with most permissive scope.
      clientId = accessGrant.clientId;
      siteId = accessGrant.siteId;
    }

    for (const capability of accessGrant.capabilities) {
      combinedCapabilities.add(capability);
    }
  }

  return new AccessGrant({
    scope: mostPermissiveScope,
    capabilities: Array.from(combinedCapabilities),
    clientId,
    siteId,
  });
};

interface IAccessContext {
  requestedClientId?: string;
  requestedSiteId?: string;
  accessIntent?: AccessIntent;
}

const buildAccessGrantResponseCacheKey = (
  idpId: string,
  { requestedClientId, requestedSiteId, accessIntent }: IAccessContext = {},
) =>
  `access-grant:idpId:${idpId}|client:${requestedClientId ?? 'default'}|site:${requestedSiteId ?? 'default'}|intent:${accessIntent ?? 'user'}`;

const INTENT_VARIANTS: AccessIntent[] = ['system', 'elevated', 'user'];

const clearAccessGrantResponseCache = async ({
  idpId,
  clientId,
  siteId,
  siteIds,
  deleteFn,
}: {
  idpId: string;
  clientId: string;
  siteId?: string | null;
  siteIds?: string[];
  deleteFn: (keys: string[]) => Promise<void>;
}) => {
  const keys: string[] = [];

  // For each organization context combination, generate keys for all intent variants.
  const contexts: IAccessContext[] = [{}, { requestedClientId: clientId }];

  // Add keys for all additional site IDs.
  const allSiteIds: string[] = [];
  if (siteId) {
    allSiteIds.push(siteId);
  }
  if (siteIds) {
    allSiteIds.push(...siteIds);
  }

  allSiteIds.forEach((siteId) => {
    contexts.push({
      requestedClientId: clientId,
      requestedSiteId: siteId,
    });
  });

  for (const context of contexts) {
    for (const intent of INTENT_VARIANTS) {
      keys.push(
        buildAccessGrantResponseCacheKey(idpId, {
          ...context,
          accessIntent: intent,
        }),
      );
    }
  }

  await deleteFn(keys);
};

export {
  AccessGrant,
  buildAccessGrantResponseCacheKey,
  clearAccessGrantResponseCache,
  reduceAccessGrants,
};
export type {
  IAccessContext,
  IAccessGrantData,
  IAccessGrantResultDetails,
  TAccessGrantResult,
};
