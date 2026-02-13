import { isValidCapability, TCapability } from 'src/auth/utils/capabilities';
import { TScope } from 'src/auth/utils/scope';
import { Prisma } from 'src/generated/prisma/client';
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
}

/**
 * Convert a database Role to the Role interface.
 */
export function databaseRoleToRole(role: Prisma.RoleGetPayload<object>): Role {
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
  };
}
