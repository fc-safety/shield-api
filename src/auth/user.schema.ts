import { z } from 'zod';
import { TCapability } from './utils/capabilities';
import { TScope } from './utils/scope';

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
});

export type TokenPayload = z.infer<typeof keycloakTokenPayloadSchema>;

/**
 * Interface for user identity data from JWT token.
 * Does NOT include client/site/permissions - those come from the database.
 */
export interface StatelessUserData {
  idpId: string;
  email: string;
  username: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

/**
 * Interface for full user data including permissions.
 * Used to construct StatelessUser with role information from database.
 */
export interface StatelessUserWithRoleData extends StatelessUserData {
  scope: TScope;
  capabilities: TCapability[];
}

/**
 * Represents an authenticated user with their capabilities and scope.
 *
 * Identity information comes from the JWT token.
 * Scope and capabilities come from the database (PersonClientAccess.role).
 *
 * Key concepts:
 * - **Scope**: Determines HOW MUCH data the user can access (GLOBAL, CLIENT, SITE, etc.)
 * - **Capabilities**: Determine WHAT ACTIONS the user can perform (manage-assets, etc.)
 */
export class StatelessUser {
  readonly idpId: string;
  readonly email: string;
  readonly username: string;
  readonly name?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly picture?: string;
  // TODO: Move these to separate CLS variables
  // readonly scope: TScope;
  // readonly capabilities: TCapability[];

  constructor(data: StatelessUserData) {
    this.idpId = data.idpId;
    this.email = data.email;
    this.username = data.username;
    this.name = data.name;
    this.givenName = data.givenName;
    this.familyName = data.familyName;
    this.picture = data.picture;
  }
}

/**
 * Build user identity data from a JWT token payload.
 *
 * Note: This only contains identity information from the token.
 * Scope and capabilities are loaded separately from the database.
 */
export const buildUserFromToken = (payload: unknown): StatelessUser => {
  const parsed = keycloakTokenPayloadSchema.parse(payload);
  return new StatelessUser({
    idpId: parsed.sub,
    email: parsed.email,
    username: parsed.preferred_username,
    name: parsed.name ?? undefined,
    givenName: parsed.given_name ?? undefined,
    familyName: parsed.family_name ?? undefined,
    picture: parsed.picture ?? undefined,
  });
};
