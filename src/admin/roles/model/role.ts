import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';

export interface Role {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  permissions: string[];
  createdOn: string;
  updatedOn: string;
}

export type ValidatedGroupRepresentation = GroupRepresentation & {
  id: string;
  attributes: { role_id: [string, ...string[]] } & Record<string, string[]>;
};

export const validateKeycloakGroup = (
  g: GroupRepresentation,
): g is ValidatedGroupRepresentation =>
  g.id &&
  g.attributes &&
  g.attributes.role_id &&
  Array.isArray(g.attributes.role_id) &&
  g.attributes.role_id.length > 0;

export const keycloakGroupAsRole = (
  group: ValidatedGroupRepresentation,
  appClientId: string,
): Role => ({
  id: group.attributes.role_id[0],
  groupId: group.id,
  name: group.name ?? 'Unknown role',
  description: group.attributes.role_description?.[0],
  permissions: group.clientRoles?.[appClientId] ?? [],
  createdOn: group.attributes.role_created_at?.[0] ?? new Date().toISOString(),
  updatedOn: group.attributes.role_updated_at?.[0] ?? new Date().toISOString(),
});
