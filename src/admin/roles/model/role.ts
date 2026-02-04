import { isValidCapability, TCapability } from 'src/auth/capabilities';
import { TScope } from 'src/auth/scope';
import {
  NotificationGroupId,
  NotificationGroupIds,
} from 'src/notifications/notification-types';

/**
 * Role interface representing a role with capabilities and scope.
 */
export interface Role {
  id: string;
  groupId: string; // For backwards compatibility, same as id
  name: string;
  description?: string;
  scope: TScope;
  capabilities: TCapability[];
  notificationGroups: NotificationGroupId[];
  createdOn: string;
  updatedOn: string;
  clientAssignable: boolean;
  clientId?: string | null;
}

/**
 * Database Role type (from Prisma).
 */
export interface DatabaseRole {
  id: string;
  name: string;
  description: string | null;
  createdOn: Date;
  modifiedOn: Date;
  clientAssignable: boolean;
  notificationGroups: string[];
  scope: TScope;
  capabilities: string[];
  clientId: string | null;
}

/**
 * Convert a database Role to the Role interface.
 */
export function databaseRoleToRole(role: DatabaseRole): Role {
  return {
    id: role.id,
    groupId: role.id, // Use the role ID as groupId for compatibility
    name: role.name,
    description: role.description ?? undefined,
    scope: role.scope,
    capabilities: role.capabilities.filter(isValidCapability),
    notificationGroups: role.notificationGroups.filter(
      (ngId): ngId is NotificationGroupId =>
        NotificationGroupIds.includes(ngId as NotificationGroupId),
    ),
    createdOn: role.createdOn.toISOString(),
    updatedOn: role.modifiedOn.toISOString(),
    clientAssignable: role.clientAssignable,
    clientId: role.clientId,
  };
}
