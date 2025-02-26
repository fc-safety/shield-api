import type RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import {
  describePermission,
  namePermission,
  TPermission,
  TVisibilityPermission,
  VALID_PERMISSIONS,
  VISIBILITY_PERMISSIONS,
} from 'src/auth/permissions';

export type ValidatedRoleRepresentation = RoleRepresentation & {
  id: string;
  name: TPermission;
};

export const validateKeycloakRole = (
  role: RoleRepresentation,
  allowedPermissions: TPermission[] = VALID_PERMISSIONS,
): role is ValidatedRoleRepresentation => {
  return (
    typeof role.id === 'string' &&
    typeof role.name === 'string' &&
    allowedPermissions.includes(role.name as TPermission)
  );
};

export interface Permission {
  id: string;
  name: string;
  friendlyName: string;
  description: string;
  type: 'visibility' | 'action';
  clientId: string;
}

export const keycloakRoleAsPermission = (
  role: ValidatedRoleRepresentation,
): Permission => {
  return {
    id: role.id,
    name: role.name,
    friendlyName: namePermission(role.name),
    description: role.description ?? describePermission(role.name),
    type: VISIBILITY_PERMISSIONS.includes(role.name as TVisibilityPermission)
      ? 'visibility'
      : 'action',
    clientId: role.containerId ?? '',
  };
};

export interface PermissionsGroup {
  title: string;
  many?: boolean;
  permissions?: Permission[];
  children?: PermissionsGroup[];
  defaultName?: string;
}
