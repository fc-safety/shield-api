import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  isValidCapability,
  TCapability,
  VALID_CAPABILITIES,
} from 'src/auth/capabilities';
import { isScopeAtLeast, RoleScope, TScope } from 'src/auth/scope';
import { CommonClsStore } from 'src/common/types';
import {
  NotificationGroupId,
  NotificationGroups,
} from 'src/notifications/notification-types';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { databaseRoleToRole, Role } from './model/role';

// Cache TTL for database role capabilities (5 minutes)
const ROLE_CACHE_TTL = 300_000;

@Injectable()
export class RolesService {
  constructor(
    private readonly cls: ClsService<CommonClsStore>,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ============================================================================
  // CAPABILITIES METHODS
  // ============================================================================

  /**
   * Get all available capabilities with their labels and descriptions.
   */
  getCapabilities() {
    return VALID_CAPABILITIES.map((capability) => ({
      name: capability,
      label: CAPABILITY_LABELS[capability],
      description: CAPABILITY_DESCRIPTIONS[capability],
    }));
  }

  /**
   * Get all available scopes with their hierarchy.
   */
  getScopes() {
    return Object.values(RoleScope).map((scope) => ({
      name: scope,
      label: this.getScopeLabel(scope),
      description: this.getScopeDescription(scope),
    }));
  }

  private getScopeLabel(scope: TScope): string {
    const labels: Record<TScope, string> = {
      [RoleScope.SYSTEM]: 'System',
      [RoleScope.GLOBAL]: 'Global',
      [RoleScope.CLIENT]: 'Client',
      [RoleScope.SITE_GROUP]: 'Site Group',
      [RoleScope.SITE]: 'Site',
      [RoleScope.SELF]: 'Self',
    };
    return labels[scope];
  }

  private getScopeDescription(scope: TScope): string {
    const descriptions: Record<TScope, string> = {
      [RoleScope.SYSTEM]: 'Internal system operations (M2M, cron jobs)',
      [RoleScope.GLOBAL]: 'Super admin access to all clients',
      [RoleScope.CLIENT]: 'Access to all sites within a client',
      [RoleScope.SITE_GROUP]: 'Access to a group of sites',
      [RoleScope.SITE]: 'Access to a single site',
      [RoleScope.SELF]: 'Access to own records only',
    };
    return descriptions[scope];
  }

  getNotificationGroups() {
    return Object.values(NotificationGroups);
  }

  // ============================================================================
  // ROLE CRUD METHODS
  // ============================================================================

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const prisma = this.prisma.bypassRLS();

    // Validate client exists if clientId provided
    if (createRoleDto.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: createRoleDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Client with ID ${createRoleDto.clientId} not found`,
        );
      }
    }

    // Check for duplicate name within same client scope
    const existingRole = await prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        clientId: createRoleDto.clientId ?? null,
      },
    });
    if (existingRole) {
      throw new BadRequestException(
        `Role with name "${createRoleDto.name}" already exists${createRoleDto.clientId ? ' for this client' : ''}`,
      );
    }

    // Validate scope restrictions for client-assignable roles
    if (createRoleDto.clientAssignable) {
      if (isScopeAtLeast(createRoleDto.scope, RoleScope.GLOBAL)) {
        throw new BadRequestException(
          'Client-assignable roles cannot have GLOBAL or SYSTEM scope.',
        );
      }
    }

    // Validate capabilities are valid
    const invalidCapabilities = createRoleDto.capabilities.filter(
      (c) => !isValidCapability(c),
    );
    if (invalidCapabilities.length > 0) {
      throw new BadRequestException(
        `Invalid capabilities: ${invalidCapabilities.join(', ')}`,
      );
    }

    const role = await prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        clientId: createRoleDto.clientId,
        clientAssignable: createRoleDto.clientAssignable,
        notificationGroups: createRoleDto.notificationGroups ?? [],
        scope: createRoleDto.scope,
        capabilities: createRoleDto.capabilities,
      },
    });

    return databaseRoleToRole(role);
  }

  async getRoles(): Promise<Role[]> {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    const roles = await prisma.role.findMany({
      where: user?.isSystemAdmin()
        ? {} // Super admin sees all roles
        : { clientAssignable: true }, // Others see only client-assignable
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((role) => databaseRoleToRole(role));
  }

  async getRole(id: string): Promise<Role> {
    const user = this.cls.get('user');
    const prisma = this.prisma.bypassRLS();

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    // Check access: super admin sees all, others see only client-assignable
    if (!role.clientAssignable && !user?.isSystemAdmin()) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return databaseRoleToRole(role);
  }

  async updateRole(
    roleId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    if (existingRole.isSystem) {
      throw new BadRequestException('Cannot modify a system role');
    }

    // Determine final scope
    const newScope = updateRoleDto.scope ?? existingRole.scope;
    const newClientAssignable =
      updateRoleDto.clientAssignable ?? existingRole.clientAssignable;

    // Validate scope restrictions for client-assignable roles
    if (newClientAssignable && isScopeAtLeast(newScope, RoleScope.GLOBAL)) {
      throw new BadRequestException(
        'Client-assignable roles cannot have GLOBAL or SYSTEM scope.',
      );
    }

    // Validate capabilities if provided
    if (updateRoleDto.capabilities) {
      const invalidCapabilities = updateRoleDto.capabilities.filter(
        (c) => !isValidCapability(c),
      );
      if (invalidCapabilities.length > 0) {
        throw new BadRequestException(
          `Invalid capabilities: ${invalidCapabilities.join(', ')}`,
        );
      }
    }

    // Check for duplicate name if name is being changed
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const duplicateRole = await prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          clientId: existingRole.clientId,
          id: { not: roleId },
        },
      });
      if (duplicateRole) {
        throw new BadRequestException(
          `Role with name "${updateRoleDto.name}" already exists`,
        );
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        clientAssignable: updateRoleDto.clientAssignable,
        notificationGroups: updateRoleDto.notificationGroups,
        scope: updateRoleDto.scope,
        capabilities: updateRoleDto.capabilities,
      },
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);

    return databaseRoleToRole(updatedRole);
  }

  async deleteRole(roleId: string): Promise<void> {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            personClientAccess: true,
          },
        },
      },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    if (existingRole.isSystem) {
      throw new BadRequestException('Cannot delete a system role');
    }

    if (existingRole._count.personClientAccess > 0) {
      throw new BadRequestException(
        `Cannot delete role that is assigned to ${existingRole._count.personClientAccess} person(s). Remove assignments first.`,
      );
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);
  }

  // ============================================================================
  // CAPABILITY MANAGEMENT METHODS
  // ============================================================================

  /**
   * Add capabilities to a role.
   */
  async addCapabilities(
    roleId: string,
    capabilities: TCapability[],
  ): Promise<Role> {
    const prisma = this.prisma.bypassRLS();

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify a system role');
    }

    // Validate capabilities
    const invalidCapabilities = capabilities.filter(
      (c) => !isValidCapability(c),
    );
    if (invalidCapabilities.length > 0) {
      throw new BadRequestException(
        `Invalid capabilities: ${invalidCapabilities.join(', ')}`,
      );
    }

    // Merge with existing capabilities (deduplicate)
    const existingCapabilities = role.capabilities as TCapability[];
    const newCapabilities = [
      ...new Set([...existingCapabilities, ...capabilities]),
    ];

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: { capabilities: newCapabilities },
    });

    await this.invalidateRoleCache(roleId);

    return databaseRoleToRole(updatedRole);
  }

  /**
   * Remove capabilities from a role.
   */
  async removeCapabilities(
    roleId: string,
    capabilities: TCapability[],
  ): Promise<Role> {
    const prisma = this.prisma.bypassRLS();

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify a system role');
    }

    // Remove capabilities
    const existingCapabilities = role.capabilities as TCapability[];
    const newCapabilities = existingCapabilities.filter(
      (c) => !capabilities.includes(c),
    );

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: { capabilities: newCapabilities },
    });

    await this.invalidateRoleCache(roleId);

    return databaseRoleToRole(updatedRole);
  }

  /**
   * Set the scope for a role.
   */
  async setScope(roleId: string, scope: TScope): Promise<Role> {
    const prisma = this.prisma.bypassRLS();

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify a system role');
    }

    // Validate scope restrictions for client-assignable roles
    if (role.clientAssignable && isScopeAtLeast(scope, RoleScope.GLOBAL)) {
      throw new BadRequestException(
        'Client-assignable roles cannot have GLOBAL or SYSTEM scope.',
      );
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: { scope },
    });

    await this.invalidateRoleCache(roleId);

    return databaseRoleToRole(updatedRole);
  }

  // ============================================================================
  // NOTIFICATION GROUP METHODS
  // ============================================================================

  async updateNotificationGroups(
    roleId: string,
    notificationGroupIds: NotificationGroupId[],
  ): Promise<Role> {
    return await this.updateRole(roleId, {
      notificationGroups: notificationGroupIds,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Invalidate the cached data for a role.
   */
  private async invalidateRoleCache(roleId: string): Promise<void> {
    const cacheKey = `role-capabilities:${roleId}`;
    await this.cache.del(cacheKey);
  }

  /**
   * Get capabilities for a role (cached).
   * Used by other services for permission lookups.
   */
  async getRoleCapabilities(roleId: string): Promise<TCapability[]> {
    const cacheKey = `role-capabilities:${roleId}`;

    // Check cache first
    const cachedValue = await this.cache.get<TCapability[]>(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    // Fetch from database
    const prisma = this.prisma.bypassRLS();
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { capabilities: true },
    });

    if (!role) {
      return [];
    }

    const result = role.capabilities.filter(isValidCapability);

    // Cache the result
    await this.cache.set(cacheKey, result, ROLE_CACHE_TTL);

    return result;
  }

  /**
   * Get scope for a role (cached).
   */
  async getRoleScope(roleId: string): Promise<TScope | null> {
    const cacheKey = `role-scope:${roleId}`;

    // Check cache first
    const cachedValue = await this.cache.get<TScope>(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    // Fetch from database
    const prisma = this.prisma.bypassRLS();
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { scope: true },
    });

    if (!role) {
      return null;
    }

    // Cache the result
    await this.cache.set(cacheKey, role.scope, ROLE_CACHE_TTL);

    return role.scope;
  }
}
