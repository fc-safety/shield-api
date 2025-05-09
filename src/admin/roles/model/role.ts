import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import {
  NotificationGroupId,
  NotificationGroupIds,
} from 'src/notifications/notification-types';
import { z } from 'zod';

export interface Role {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  permissions: string[];
  notificationGroups: NotificationGroupId[];
  createdOn: string;
  updatedOn: string;
  clientAssignable: boolean;
}

export const keycloakGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  attributes: z.object({
    role_id: z.array(z.string()).min(1),
    role_description: z.array(z.string()).optional(),
    role_created_at: z.array(z.string()).min(1),
    role_updated_at: z.array(z.string()).min(1),
    role_notification_group: z.array(z.string()).optional(),
    role_client_assignable: z.array(z.string()).optional(),
  }),
});

export type ValidatedGroupRepresentation = GroupRepresentation &
  z.infer<typeof keycloakGroupSchema>;

export const validateKeycloakGroup = (
  g: GroupRepresentation,
): g is ValidatedGroupRepresentation =>
  keycloakGroupSchema.safeParse(g).success;

export const keycloakGroupAsRole = (
  group: ValidatedGroupRepresentation,
  appClientId: string,
): Role => ({
  id: group.attributes.role_id[0],
  groupId: group.id,
  name: group.name ?? 'Unknown role',
  description: group.attributes.role_description?.[0],
  permissions: group.clientRoles?.[appClientId] ?? [],
  notificationGroups:
    group.attributes.role_notification_group?.filter(
      (ngId): ngId is NotificationGroupId =>
        NotificationGroupIds.includes(ngId as NotificationGroupId),
    ) ?? [],
  createdOn: group.attributes.role_created_at[0],
  updatedOn: group.attributes.role_updated_at[0],
  clientAssignable: group.attributes.role_client_assignable?.[0] === 'true',
});
