import RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import {
  getShieldClient,
  KeycloakService,
} from 'src/auth/keycloak/keycloak.service';
import {
  ACTION_PERMISSIONS,
  titleize,
  VISIBILITY,
  VISIBILITY_PERMISSIONS,
} from 'src/auth/permissions';
import { ApiConfigService } from 'src/config/api-config.service';
import { NotificationGroups } from 'src/notifications/notification-types';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateNotificationGroupMappingDto } from './dto/update-notification-group-mapping.dto';
import { UpdatePermissionMappingDto } from './dto/update-permission-mapping.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  keycloakRoleAsPermission,
  PermissionsGroup,
  validateKeycloakRole,
} from './model/permission';
import { keycloakGroupAsRole, Role, validateKeycloakGroup } from './model/role';

@Injectable()
export class RolesService {
  private appClientId: string;
  private appClientUuid: Promise<string | undefined>;
  private parentRolesGroupId: Promise<string>;
  private defaultVisibilityRole: Promise<RoleRepresentation | null>;

  constructor(
    private readonly keycloak: KeycloakService,
    private readonly config: ApiConfigService,
  ) {
    this.appClientId = this.config.get('AUTH_AUDIENCE');
    this.appClientUuid = getShieldClient(
      this.keycloak.client,
      this.appClientId,
    ).then((c) => c?.id);
    this.parentRolesGroupId = this.keycloak
      .getOrCreateManagedRolesGroup()
      .then(({ id }) => id);
    this.defaultVisibilityRole = this.appClientUuid.then((clientUuid) =>
      this.keycloak.client.clients.findRole({
        id: clientUuid ?? '',
        roleName: VISIBILITY.SELF,
      }),
    );
  }

  async getPermissions() {
    const clientRoles = await this.keycloak.client.clients.listRoles({
      id: (await this.appClientUuid) ?? '',
    });

    const permissionsByResource = clientRoles
      .filter((r) => validateKeycloakRole(r, ACTION_PERMISSIONS))
      .reduce(
        (acc, r) => {
          const [, resource] = r.name.split(':');

          if (!acc[resource]) {
            acc[resource] = {
              title: titleize(resource),
              many: true,
              permissions: [],
            };
          }

          acc[resource]!.permissions!.push(keycloakRoleAsPermission(r));

          return acc;
        },
        {} as Record<string, PermissionsGroup>,
      );

    const visibilityPermissions = clientRoles
      .filter((r) => validateKeycloakRole(r, VISIBILITY_PERMISSIONS))
      .map((r) => keycloakRoleAsPermission(r));

    return {
      permissionsFlat: [
        ...visibilityPermissions,
        ...Object.values(permissionsByResource)
          .map((g) => g.permissions)
          .flat(),
      ],
      permissions: {
        visibility: {
          title: 'Visibility',
          many: false,
          permissions: visibilityPermissions,
          defaultName: visibilityPermissions.find(
            (p) => p.name === VISIBILITY.SELF,
          )?.name,
        },
        resources: {
          title: 'Resources',
          many: true,
          children: Object.values(permissionsByResource),
        },
      },
    };
  }

  getNotificationGroups() {
    return Object.values(NotificationGroups);
  }

  async getPermissionByName(name: string) {
    return this.keycloak.client.clients.findRole({
      id: (await this.appClientUuid) ?? '',
      roleName: name,
    });
  }

  async createRole(createRoleDto: CreateRoleDto) {
    const roleId = createId();
    const { id: groupId } = await this.keycloak.client.groups.createChildGroup(
      {
        id: await this.parentRolesGroupId,
      },
      {
        name: createRoleDto.name,
        attributes: {
          role_id: [roleId],
          role_description: createRoleDto.description && [
            createRoleDto.description,
          ],
          role_created_at: [new Date().toISOString()],
          role_updated_at: [new Date().toISOString()],
          role_notification_group: createRoleDto.notificationGroups && [
            ...createRoleDto.notificationGroups,
          ],
        },
      },
    );

    const defaultVisibilityRole = await this.defaultVisibilityRole;
    if (defaultVisibilityRole?.id) {
      await this.keycloak.client.groups.addClientRoleMappings({
        id: groupId,
        clientUniqueId: (await this.appClientUuid) ?? '',
        roles: [
          {
            id: defaultVisibilityRole.id,
            name: VISIBILITY.SELF,
          },
        ],
      });
    }

    return this.getRole(roleId);
  }

  async getRoles(): Promise<Role[]> {
    const { id } = await this.keycloak.getOrCreateManagedRolesGroup();
    const groups = await this.keycloak.client.groups.listSubGroups({
      parentId: id,
    });
    return groups
      .filter(validateKeycloakGroup)
      .map((g) => keycloakGroupAsRole(g, this.appClientId));
  }

  async getRole(id: string): Promise<Role> {
    const group = await this.getRoleGroup(id);
    return keycloakGroupAsRole(group, this.appClientId);
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto) {
    const roleGroup = await this.getRoleGroup(roleId);
    const { description, notificationGroups, ...roleDefaults } = updateRoleDto;

    const attributes = KeycloakService.mergeAttributes(
      roleGroup.attributes,
      ['role_description', description],
      ['role_updated_at', new Date().toISOString()],
      ['role_notification_group', notificationGroups],
    );

    await this.keycloak.client.groups.update(
      { id: roleGroup.id },
      {
        ...roleGroup,
        ...roleDefaults,
        attributes,
      },
    );
    return this.getRole(roleId);
  }

  async deleteRole(roleId: string) {
    const roleGroup = await this.getRole(roleId);
    await this.keycloak.client.groups.del({ id: roleGroup.groupId });
  }

  async updatePermissionToRoleMappings(
    roleId: string,
    updatePermissionMappingDto: UpdatePermissionMappingDto,
  ) {
    const role = await this.getRole(roleId);
    if (updatePermissionMappingDto.grant.length) {
      await this.keycloak.client.groups.addClientRoleMappings({
        id: role.groupId,
        clientUniqueId: (await this.appClientUuid) ?? '',
        roles: updatePermissionMappingDto.grant.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });
    }
    if (updatePermissionMappingDto.revoke.length) {
      await this.keycloak.client.groups.delClientRoleMappings({
        id: role.groupId,
        clientUniqueId: (await this.appClientUuid) ?? '',
        roles: updatePermissionMappingDto.revoke.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });
    }
  }

  async updateNotificationGroups(
    roleId: string,
    updateNotificationGroupMappingDto: UpdateNotificationGroupMappingDto,
  ) {
    return await this.updateRole(roleId, {
      notificationGroups:
        updateNotificationGroupMappingDto.notificationGroupIds,
    });
  }

  public async getRoleGroup(roleId: string) {
    const group = (
      await this.keycloak.client.groups.find({
        q: `role_id:${roleId}`,
        briefRepresentation: false,
        populateHierarchy: false,
      })
    ).at(0);
    if (!group || !validateKeycloakGroup(group))
      throw new NotFoundException(`Role ${roleId} not found`);
    return group;
  }
}
