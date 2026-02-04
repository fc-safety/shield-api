import { z } from 'zod';
import { isValidCapability, TCapability } from './capabilities';
import { isScopeAtLeast, RoleScope, TScope } from './scope';

/**
 * Schema for JWT token payload from the identity provider.
 *
 * Note: Permissions/capabilities are NOT loaded from the JWT anymore.
 * They come from the database via PersonClientAccess.role.
 */
export const keycloakTokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  preferred_username: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
  client_id: z.string().default('unknown'),
  site_id: z.string().default('unknown'),
});

export type TokenPayload = z.infer<typeof keycloakTokenPayloadSchema>;

/**
 * Interface for user data used to construct StatelessUser.
 * This is populated from either JWT + database lookup or directly from PersonRepresentation.
 */
export interface StatelessUserData {
  idpId: string;
  email: string;
  username: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  clientId: string;
  siteId: string;
  scope: TScope;
  capabilities: TCapability[];
}

/**
 * Represents an authenticated user with their capabilities and scope.
 *
 * This is a stateless representation that can be serialized/deserialized
 * and passed through the request context.
 *
 * Key concepts:
 * - **Scope**: Determines HOW MUCH data the user can access (GLOBAL, CLIENT, SITE, etc.)
 * - **Capabilities**: Determine WHAT ACTIONS the user can perform (manage-assets, perform-inspections, etc.)
 */
export class StatelessUser {
  readonly idpId: string;
  readonly email: string;
  readonly username: string;
  readonly name?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly picture?: string;
  readonly clientId: string;
  readonly siteId: string;
  readonly scope: TScope;
  readonly capabilities: TCapability[];

  constructor(data: StatelessUserData) {
    this.idpId = data.idpId;
    this.email = data.email;
    this.username = data.username;
    this.name = data.name;
    this.givenName = data.givenName;
    this.familyName = data.familyName;
    this.picture = data.picture;
    this.clientId = data.clientId;
    this.siteId = data.siteId;
    this.scope = data.scope;
    this.capabilities = data.capabilities.filter(isValidCapability);
  }

  /**
   * Check if user has SYSTEM scope (system admin access).
   */
  public isSystemAdmin(): boolean {
    return this.scope === RoleScope.SYSTEM || this.scope === RoleScope.GLOBAL;
  }

  /**
   * Check if user has at least GLOBAL scope (can access all clients).
   */
  public isGlobalAdmin(): boolean {
    return isScopeAtLeast(this.scope, RoleScope.GLOBAL);
  }

  /**
   * Check if user has at least CLIENT scope (can access all sites in their client).
   */
  public isClientAdmin(): boolean {
    return isScopeAtLeast(this.scope, RoleScope.CLIENT);
  }

  /**
   * Check if user's scope is at least as permissive as the required scope.
   *
   * @example
   * user.scopeAllows(RoleScope.CLIENT) // true if user has CLIENT, GLOBAL, or SYSTEM scope
   */
  public scopeAllows(required: TScope): boolean {
    return isScopeAtLeast(this.scope, required);
  }

  /**
   * Check if user has a specific capability.
   */
  public hasCapability(capability: TCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if user has any of the specified capabilities.
   */
  public hasAnyCapability(capabilities: TCapability[]): boolean {
    return capabilities.some((c) => this.capabilities.includes(c));
  }

  /**
   * Check if user has all of the specified capabilities.
   */
  public hasAllCapabilities(capabilities: TCapability[]): boolean {
    return capabilities.every((c) => this.capabilities.includes(c));
  }
}

/**
 * Build a minimal user from a JWT token payload.
 *
 * Note: This creates a user with NO capabilities and SELF scope.
 * The actual capabilities and scope should be loaded from the database
 * via PersonClientAccess and merged in by the auth layer.
 */
export const buildUserFromToken = (payload: unknown): StatelessUserData => {
  const parsed = keycloakTokenPayloadSchema.parse(payload);
  return {
    idpId: parsed.sub,
    email: parsed.email,
    username: parsed.preferred_username,
    name: parsed.name,
    givenName: parsed.given_name,
    familyName: parsed.family_name,
    picture: parsed.picture,
    clientId: parsed.client_id,
    siteId: parsed.site_id,
    // Default to no access - will be populated from database
    scope: RoleScope.SELF,
    capabilities: [],
  };
};
