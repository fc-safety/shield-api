import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { Role, ValidatedGroupRepresentation } from 'src/admin/roles/model/role';
import { isNil } from 'src/common/utils';
import { z } from 'zod';

export interface ClientUser {
  id: string;
  createdOn: string;
  modifiedOn: string;
  idpId: string;
  active: boolean;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  username?: string;
  siteExternalId: string;
  clientExternalId: string;
  /** @deprecated Use roles array instead. Returns first role for backward compatibility. */
  roleName?: string;
  roles: Pick<Role, 'id' | 'name' | 'permissions' | 'notificationGroups'>[];
  position?: string;
}

export const keycloakUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  attributes: z.object({
    user_id: z.array(z.string()).min(1),
    client_id: z.array(z.string()).min(1),
    site_id: z.array(z.string()).min(1),
    phone_number: z.array(z.string()).optional(),
    user_position: z.array(z.string()).optional(),
    user_created_at: z.array(z.string()),
    user_updated_at: z.array(z.string()),
  }),
});

export type ValidatedUserRepresentation = UserRepresentation &
  z.infer<typeof keycloakUserSchema>;

export const validateKeycloakUser = (
  user: UserRepresentation,
): user is ValidatedUserRepresentation =>
  keycloakUserSchema.safeParse(user).success;

export const keycloakUserAsClientUser = (
  user: ValidatedUserRepresentation,
  allRoleGroups: ValidatedGroupRepresentation[],
  convertGroupToRole: (group: ValidatedGroupRepresentation) => Role,
): ClientUser => {
  const groupsByPathMap = new Map(allRoleGroups.map((g) => [g.path ?? '', g]));
  // Extract all role groups (not just the first one)
  const roles =
    user.groups
      ?.map((path) => groupsByPathMap.get(path))
      .filter((group): group is NonNullable<typeof group> => !isNil(group))
      .map((g) => convertGroupToRole(g)) ?? [];

  return {
    id: user.attributes.user_id[0],
    createdOn: user.attributes.user_created_at[0],
    modifiedOn: user.attributes.user_updated_at[0],
    idpId: user.id,
    active: !!user.enabled,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phoneNumber: user.attributes.phone_number?.[0],
    username: user.username,
    siteExternalId: user.attributes.site_id[0],
    clientExternalId: user.attributes.client_id[0],
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions,
      notificationGroups: r.notificationGroups,
    })),
    // Backward compatibility: return first role or undefined
    roleName: roles[0]?.name ?? undefined,
    position: user.attributes.user_position?.[0],
  };
};
