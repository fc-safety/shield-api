import { z } from 'zod';
import {
  ActionableResource,
  getResourcePermission,
  isValidPermission,
  TAction,
  TPermission,
  TResource,
  TVisibility,
  VISIBILITY,
  VISIBILITY_VALUES,
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
  permissions: z
    .array(z.string())
    .transform((roles) => roles.filter(isValidPermission))
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
    this.permissions =
      payload.permissions ?? payload.resource_access?.['shield-api']?.roles;
    this.clientId = payload.client_id;
    this.siteId = payload.site_id;
  }

  public isSuperAdmin() {
    return !!this.permissions?.includes(VISIBILITY.SUPER_ADMIN);
  }

  public isGlobalAdmin() {
    return (
      this.isSuperAdmin() || !!this.permissions?.includes(VISIBILITY.GLOBAL)
    );
  }

  public get visibility(): TVisibility {
    if (this.permissions) {
      const visibilityPermissions = new Set<TVisibility>();
      this.permissions
        .filter((p) => p.startsWith('visibility:'))
        .forEach((p) =>
          visibilityPermissions.add(
            p.replace('visibility:', '') as TVisibility,
          ),
        );

      // Return the most permissive visibility level.
      for (const visibility of VISIBILITY_VALUES) {
        if (visibilityPermissions.has(visibility)) {
          return visibility;
        }
      }
    }

    return 'self';
  }

  public hasPermissions(
    permissions: TPermission[],
    mode: 'any' | 'all' = 'all',
  ) {
    if (mode === 'any') {
      return permissions.some((p) => this.permissions?.includes(p) ?? false);
    } else {
      return permissions.every((p) => this.permissions?.includes(p) ?? false);
    }
  }

  public hasPermission(permission: TPermission) {
    return this.permissions?.includes(permission) ?? false;
  }

  public can<A extends TAction>(action: A, resource: ActionableResource<A>) {
    const hasExact = this.hasPermission(
      getResourcePermission(action, resource),
    );
    if (['create', 'update', 'read', 'delete'].includes(action)) {
      return hasExact || this.canManage(resource);
    }
    return hasExact;
  }

  public canManage(resource: ActionableResource<'manage'>) {
    return this.can('manage', resource);
  }

  public canCreate(resource: ActionableResource<'create'>) {
    return this.canManage(resource) || this.can('create', resource);
  }

  public canRead(resource: TResource) {
    return this.canManage(resource) || this.can('read', resource);
  }

  public canUpdate(resource: TResource) {
    return this.canManage(resource) || this.can('update', resource);
  }

  public canDelete(resource: TResource) {
    return this.canManage(resource) || this.can('delete', resource);
  }
}

export const buildUserFromToken = (payload: unknown) =>
  new StatelessUser(keycloakTokenPayloadSchema.parse(payload));
