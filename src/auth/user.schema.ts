import { z } from 'zod';
import {
  isValidPermission,
  TPermission,
  TVisibility,
  VISIBILITY,
} from './permissions';

export const keycloakTokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  preferred_username: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
  resource_access: z
    .record(
      z.string(),
      z.object({
        roles: z
          .array(z.string())
          .transform((roles) => roles.filter(isValidPermission)),
      }),
    )
    .optional(),
  client_id: z.string().default('unknown'),
  site_id: z.string().default('unknown'),
});

export class StatelessUser {
  readonly idpId: string;
  readonly email: string;
  readonly username: string;
  readonly name?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly picture?: string;
  readonly permissions?: TPermission[];
  readonly clientId: string;
  readonly siteId: string;

  constructor(payload: z.infer<typeof keycloakTokenPayloadSchema>) {
    this.idpId = payload.sub;
    this.email = payload.email;
    this.username = payload.preferred_username;
    this.name = payload.name;
    this.givenName = payload.given_name;
    this.familyName = payload.family_name;
    this.picture = payload.picture;
    this.permissions = payload.resource_access?.['shield-api']?.roles;
    this.clientId = payload.client_id;
    this.siteId = payload.site_id;
  }

  public isGlobalAdmin() {
    return !!this.permissions?.includes(VISIBILITY.GLOBAL);
  }

  public get visibility(): TVisibility {
    const visibilityPermission = this.permissions?.find((p) =>
      p.startsWith('visibility:'),
    );

    if (visibilityPermission) {
      return visibilityPermission.replace('visibility:', '') as TVisibility;
    }

    return 'self';
  }
}

export const buildUserFromToken = (payload: unknown) =>
  new StatelessUser(keycloakTokenPayloadSchema.parse(payload));
