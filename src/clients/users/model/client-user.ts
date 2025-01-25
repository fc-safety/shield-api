import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { MANAGED_ROLES_GROUP_NAME } from 'src/auth/keycloak/keycloak.service';

export interface ClientUser {
  id: string;
  idpId: string;
  active: boolean;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  username?: string;
  siteExternalId: string;
  clientExternalId: string;
  roleName?: string;
}

export type ValidatedUserRepresentation = UserRepresentation & {
  id: string;
  email: string;
  attributes: {
    user_id: [string, ...string[]];
    client_id: [string, ...string[]];
    site_id: [string, ...string[]];
  } & Record<string, string[]>;
};

export const validateKeycloakUser = (
  user: UserRepresentation,
): user is ValidatedUserRepresentation =>
  user.id &&
  user.email &&
  user.attributes &&
  user.attributes.user_id &&
  Array.isArray(user.attributes.user_id) &&
  user.attributes.user_id.length > 0 &&
  user.attributes.client_id &&
  Array.isArray(user.attributes.client_id) &&
  user.attributes.client_id.length > 0 &&
  user.attributes.site_id &&
  Array.isArray(user.attributes.site_id) &&
  user.attributes.site_id.length > 0;

export const keycloakUserAsClientUser = (
  user: ValidatedUserRepresentation,
): ClientUser => ({
  id: user.attributes.user_id[0],
  idpId: user.id,
  active: !!user.enabled,
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  name: `${user.firstName} ${user.lastName}`.trim(),
  email: user.email,
  username: user.username,
  siteExternalId: user.attributes.site_id[0],
  clientExternalId: user.attributes.client_id[0],
  roleName: user.groups
    ?.find((g) => g.includes(`${MANAGED_ROLES_GROUP_NAME}/`))
    ?.split('/')
    .at(-1),
});
