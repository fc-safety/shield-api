import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { ClsService } from 'nestjs-cls';
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
import { isNil } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { NotificationGroups } from 'src/notifications/notification-types';
import { RedisService } from 'src/redis/redis.service';
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

  // Cache configuration
  private readonly ROLE_GROUPS_CACHE_KEY = 'role-groups:all';
  private readonly ROLE_GROUPS_CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    private readonly keycloak: KeycloakService,
    private readonly config: ApiConfigService,
    private readonly cls: ClsService,
    private readonly redis: RedisService,
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
          role_description: !isNil(createRoleDto.description)
            ? [createRoleDto.description]
            : undefined,
          role_created_at: [new Date().toISOString()],
          role_updated_at: [new Date().toISOString()],
          role_notification_group: createRoleDto.notificationGroups && [
            ...createRoleDto.notificationGroups,
          ],
          role_client_assignable: [createRoleDto.clientAssignable.toString()],
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

    // Invalidate cache after creating role
    await this.invalidateRoleGroupsCache();

    return this.getRole(roleId);
  }

  async getRoles(): Promise<Role[]> {
    return this.getRoleGroups().then((groups) =>
      groups.map((g) => keycloakGroupAsRole(g, this.appClientId)),
    );
  }

  async getRole(id: string): Promise<Role> {
    const group = await this.getRoleGroup(id);
    return keycloakGroupAsRole(group, this.appClientId);
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto) {
    const roleGroup = await this.getRoleGroup(roleId);
    const role = keycloakGroupAsRole(roleGroup, this.appClientId);

    if (
      updateRoleDto.clientAssignable &&
      role.permissions.some((p) => p === VISIBILITY.GLOBAL)
    ) {
      throw new BadRequestException(
        'Cannot allow clients to assign global visibility.',
      );
    }

    if (
      updateRoleDto.clientAssignable &&
      role.permissions.some((p) => p === VISIBILITY.SUPER_ADMIN)
    ) {
      throw new BadRequestException(
        'Cannot allow clients to assign super admin visibility.',
      );
    }

    const {
      description,
      notificationGroups,
      clientAssignable,
      ...roleDefaults
    } = updateRoleDto;

    const attributes = KeycloakService.mergeAttributes(
      roleGroup.attributes,
      ['role_description', description],
      ['role_updated_at', new Date().toISOString()],
      ['role_notification_group', notificationGroups],
      ['role_client_assignable', clientAssignable?.toString()],
    );

    await this.keycloak.client.groups.update(
      { id: roleGroup.id },
      {
        ...roleGroup,
        ...roleDefaults,
        attributes,
      },
    );

    // Invalidate cache after updating role
    await this.invalidateRoleGroupsCache();

    return this.getRole(roleId);
  }

  async deleteRole(roleId: string) {
    const roleGroup = await this.getRole(roleId);
    await this.keycloak.client.groups.del({ id: roleGroup.groupId });

    // Invalidate cache after deleting role
    await this.invalidateRoleGroupsCache();
  }

  async updatePermissionToRoleMappings(
    roleId: string,
    updatePermissionMappingDto: UpdatePermissionMappingDto,
  ) {
    const role = await this.getRole(roleId);

    if (
      role.clientAssignable &&
      updatePermissionMappingDto.grant.some((p) => p.name === VISIBILITY.GLOBAL)
    ) {
      throw new BadRequestException(
        'Global visibility cannot be granted to a client-assignable role.',
      );
    }

    if (
      role.clientAssignable &&
      updatePermissionMappingDto.grant.some(
        (p) => p.name === VISIBILITY.SUPER_ADMIN,
      )
    ) {
      throw new BadRequestException(
        'Super admin visibility cannot be granted to a client-assignable role.',
      );
    }

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

    // Invalidate cache after updating permissions
    await this.invalidateRoleGroupsCache();
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

  /**
   * Invalidate the role groups cache.
   * Call this after creating, updating, or deleting roles.
   */
  private async invalidateRoleGroupsCache() {
    const redis = this.redis.getPublisher();
    await redis.del(this.ROLE_GROUPS_CACHE_KEY);
  }

  /**
   * Fetch role groups from cache or Keycloak if cache miss.
   * Filters based on user permissions (super admin sees all, others see only client-assignable).
   */
  public async getRoleGroups(): Promise<GroupRepresentation[]> {
    const user = this.cls.get('user');
    const redis = this.redis.getPublisher();

    // Try to get from cache
    const cached = await redis.get(this.ROLE_GROUPS_CACHE_KEY);
    let allGroups: GroupRepresentation[];

    if (cached) {
      allGroups = JSON.parse(cached);
    } else {
      // Cache miss - fetch from Keycloak
      const groups = await this.keycloak.client.groups.listSubGroups({
        parentId: await this.parentRolesGroupId,
      });
      allGroups = groups.filter(validateKeycloakGroup);

      // Store in cache
      await redis.setEx(
        this.ROLE_GROUPS_CACHE_KEY,
        this.ROLE_GROUPS_CACHE_TTL,
        JSON.stringify(allGroups),
      );
    }

    // Filter based on user permissions
    return allGroups.filter(
      (g) =>
        g.attributes.role_client_assignable?.[0] === 'true' ||
        !!user?.isSuperAdmin(),
    );
  }

  /**
   * Get a single role group by role ID.
   * Uses cached role groups for better performance.
   */
  public async getRoleGroup(roleId: string): Promise<GroupRepresentation> {
    const user = this.cls.get('user');
    const groups = await this.getRoleGroups();

    const group = groups.find((g) => g.attributes.role_id?.[0] === roleId);

    if (
      !group ||
      !(
        group.attributes.role_client_assignable?.[0] === 'true' ||
        user?.isSuperAdmin()
      )
    ) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    return group;
  }

  /**
   * Get multiple role groups by role IDs.
   * Consolidated method that fetches all groups once and maps to requested IDs.
   * More efficient than multiple getRoleGroup() calls.
   *
   * @param roleIds Array of role IDs to fetch
   * @returns Array of role groups
   * @throws NotFoundException if any role ID is not found
   */
  public async getRoleGroupsByRoleIds(
    roleIds: string[],
  ): Promise<GroupRepresentation[]> {
    if (roleIds.length === 0) return [];

    const allGroups = await this.getRoleGroups();

    // Create a map for O(1) lookup
    const groupMap = new Map(
      allGroups.map((g) => [g.attributes.role_id?.[0], g]),
    );

    // Map role IDs to groups and validate all were found
    const result: GroupRepresentation[] = [];
    for (const roleId of roleIds) {
      const group = groupMap.get(roleId);
      if (!group) {
        throw new NotFoundException(`Role ${roleId} not found`);
      }
      result.push(group);
    }

    return result;
  }

  /**
   * Get a single role group by role ID, optimized for batch operations.
   * Returns undefined if not found instead of throwing.
   *
   * @param roleId Role ID to fetch
   * @returns Role group or undefined if not found
   */
  public async getRoleGroupByRoleIdOrUndefined(
    roleId: string,
  ): Promise<GroupRepresentation | undefined> {
    const allGroups = await this.getRoleGroups();
    return allGroups.find((g) => g.attributes.role_id?.[0] === roleId);
  }
}
