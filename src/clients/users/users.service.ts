import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { ClsService } from 'nestjs-cls';
import { RolesService } from 'src/admin/roles/roles.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { CustomQueryFilter } from 'src/auth/keycloak/types';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow, isNil } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma, PrismaClient } from 'src/generated/prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { asFilterConditions, QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  keycloakUserAsClientUser,
  validateKeycloakUser,
} from './model/client-user';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakService,
    private readonly roles: RolesService,
    private readonly cls: ClsService<CommonClsStore>,
    private readonly notifications: NotificationsService,
    private readonly config: ApiConfigService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    const newId = createId();

    const attributes = KeycloakService.mergeAttributes(
      {},
      ['phone_number', createUserDto.phoneNumber],
      ['site_id', createUserDto.siteExternalId],
      ['client_id', client.externalId],
      ['user_id', newId],
      ['user_created_at', new Date().toISOString()],
      ['user_updated_at', new Date().toISOString()],
      ['user_position', createUserDto.position],
      ['user_legacy_id', createUserDto.legacyUserId],
    );

    await this.keycloak.client.users.create({
      enabled: createUserDto.active ?? true,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      username: createUserDto.email,
      email: createUserDto.email,
      emailVerified: true,
      attributes,
      credentials: createUserDto.password
        ? [
            {
              type: 'password',
              value: createUserDto.password,
            },
          ]
        : undefined,
    });
    return this.findOne(newId, client, bypassRLS);
  }

  async findAll(
    queryUserDto: QueryUserDto = new QueryUserDto(),
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);

    const { offset, limit } = queryUserDto;
    return this.keycloak
      .findUsersByAttribute({
        filter: {
          AND: [
            ...this.buildSiteFilters(client),
            ...asFilterConditions(queryUserDto),
          ],
        },
        limit,
        offset,
      })
      .then((r) => {
        const cleanedUsers = r.results
          .filter(validateKeycloakUser)
          .map(keycloakUserAsClientUser);

        return {
          ...r,
          limit: cleanedUsers.length,
          results: cleanedUsers,
        };
      });
  }

  async findOne(
    id: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);
    return keycloakUserAsClientUser(keycloakUser);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    const usernameIsEmail = keycloakUser.username === keycloakUser.email;

    const attributes = KeycloakService.mergeAttributes(
      keycloakUser.attributes,
      ['phone_number', updateUserDto.phoneNumber],
      ['site_id', updateUserDto.siteExternalId],
      ['user_updated_at', new Date().toISOString()],
      ['user_position', updateUserDto.position],
      ['user_legacy_id', updateUserDto.legacyUserId],
    );

    return this.keycloak.client.users.update(
      {
        id: keycloakUser.id,
      },
      {
        enabled: updateUserDto.active ?? keycloakUser.enabled,
        firstName: updateUserDto.firstName ?? keycloakUser.firstName,
        lastName: updateUserDto.lastName ?? keycloakUser.lastName,
        username:
          (usernameIsEmail ? updateUserDto.email : updateUserDto.username) ??
          keycloakUser.username,
        email: updateUserDto.email ?? keycloakUser.email,
        attributes,
      },
    );
  }

  async remove(
    id: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);
    await this.keycloak.client.users.del({ id: keycloakUser.id });
  }

  /**
   * @deprecated Use setRoles() for single role assignment or addRole() for adding additional roles.
   * This method removes all existing roles before assigning a new one (single-role behavior).
   */
  async assignRole(
    id: string,
    assignRoleDto: AssignRoleDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    // Get all role groups to check existing memberships and remove them (cached via Redis)
    const allRoleGroups = await this.roles.getRoleGroups();

    // Get the role group to assign.
    const keycloakRoleGroup = allRoleGroups.find(
      (g) => g.attributes.role_id[0] === assignRoleDto.roleId,
    );
    if (!keycloakRoleGroup) {
      throw new NotFoundException(`Role ${assignRoleDto.roleId} not found`);
    }

    // Remove from any existing role groups before assigning a new one.
    const existingJoinedRoleGroups = allRoleGroups.filter(
      (g) =>
        g.path && keycloakUser.groups && keycloakUser.groups.includes(g.path),
    );
    if (existingJoinedRoleGroups.length > 0) {
      await Promise.allSettled(
        existingJoinedRoleGroups.map((g) =>
          this.keycloak.client.users.delFromGroup({
            id: keycloakUser.id,
            groupId: g.id,
          }),
        ),
      );
    }

    return this.keycloak.client.users.addToGroup({
      id: keycloakUser.id,
      groupId: keycloakRoleGroup.id,
    });
  }

  /**
   * Add a role to a user without removing existing roles.
   * Supports multi-role assignment.
   */
  async addRole(
    id: string,
    addRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    // Get all role groups (cached via Redis)
    const allRoleGroups = await this.roles.getRoleGroups();

    // Find the role group to add
    const keycloakRoleGroup = allRoleGroups.find(
      (g) => g.attributes.role_id[0] === addRoleDto.roleId,
    );
    if (!keycloakRoleGroup) {
      throw new NotFoundException(`Role ${addRoleDto.roleId} not found`);
    }

    // Check if user already has this role
    const existingJoinedRoleGroups = allRoleGroups.filter(
      (g) =>
        g.path && keycloakUser.groups && keycloakUser.groups.includes(g.path),
    );
    const alreadyHasRole = existingJoinedRoleGroups.some(
      (g) => g.id === keycloakRoleGroup.id,
    );

    if (alreadyHasRole) {
      throw new BadRequestException(
        `User already has role ${addRoleDto.roleId}`,
      );
    }

    // Add the user to the role group
    return this.keycloak.client.users.addToGroup({
      id: keycloakUser.id,
      groupId: keycloakRoleGroup.id,
    });
  }

  /**
   * Remove a specific role from a user.
   * Other roles remain intact.
   */
  async removeRole(
    id: string,
    removeRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    // Get all role groups (cached via Redis)
    const allRoleGroups = await this.roles.getRoleGroups();

    // Find the role group to remove
    const keycloakRoleGroup = allRoleGroups.find(
      (g) => g.attributes.role_id[0] === removeRoleDto.roleId,
    );
    if (!keycloakRoleGroup) {
      throw new NotFoundException(`Role ${removeRoleDto.roleId} not found`);
    }

    // Check if user has this role
    const existingJoinedRoleGroups = allRoleGroups.filter(
      (g) =>
        g.path && keycloakUser.groups && keycloakUser.groups.includes(g.path),
    );
    const hasRole = existingJoinedRoleGroups.some(
      (g) => g.id === keycloakRoleGroup.id,
    );

    if (!hasRole) {
      throw new BadRequestException(
        `User does not have role ${removeRoleDto.roleId}`,
      );
    }

    // Remove the user from the role group
    return this.keycloak.client.users.delFromGroup({
      id: keycloakUser.id,
      groupId: keycloakRoleGroup.id,
    });
  }

  /**
   * Set the exact set of roles for a user.
   * Removes all existing roles and assigns the specified ones.
   * This is an atomic operation with transactional guarantees.
   */
  async setRoles(
    id: string,
    setRolesDto: { roleIds: string[] },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    // Check for duplicate role IDs first (cheap operation)
    const uniqueRoleIds = new Set(setRolesDto.roleIds);
    if (uniqueRoleIds.size !== setRolesDto.roleIds.length) {
      throw new BadRequestException('Duplicate role IDs are not allowed');
    }

    // Fetch only the specific role groups we need (cached + batch operation)
    // This throws NotFoundException if any role doesn't exist
    const roleGroupsToAssign =
      await this.roles.getRoleGroupsByRoleIds(setRolesDto.roleIds);

    // Get all role groups to find existing memberships (cached)
    const allRoleGroups = await this.roles.getRoleGroups();
    const existingJoinedRoleGroups = allRoleGroups.filter(
      (g) =>
        g.path && keycloakUser.groups && keycloakUser.groups.includes(g.path),
    );

    // Extract group IDs for transactional operations
    const existingGroupIds = existingJoinedRoleGroups
      .map((g) => g.id)
      .filter((id): id is string => id !== undefined);
    const newGroupIds = roleGroupsToAssign
      .map((g) => g.id)
      .filter((id): id is string => id !== undefined);

    // Use transactional operations to ensure atomicity
    // Remove all existing roles transactionally
    if (existingGroupIds.length > 0) {
      await this.keycloak.removeUserFromGroupsTransactional(
        keycloakUser.id,
        existingGroupIds,
      );
    }

    // Add all new roles transactionally
    if (newGroupIds.length > 0) {
      try {
        await this.keycloak.addUserToGroupsTransactional(
          keycloakUser.id,
          newGroupIds,
        );
      } catch (error) {
        // If adding new roles fails, attempt to restore original roles
        if (existingGroupIds.length > 0) {
          try {
            await this.keycloak.addUserToGroupsTransactional(
              keycloakUser.id,
              existingGroupIds,
            );
          } catch (restoreError) {
            // Both operations failed - log critical error
            throw new Error(
              `CRITICAL: Failed to set new roles and failed to restore original roles. User ${id} may have no roles. Original error: ${error}. Restore error: ${restoreError}`,
            );
          }
        }
        // Re-throw the original error if we successfully restored or there were no roles to restore
        throw error;
      }
    }
  }

  async resetPassword(
    id: string,
    resetPasswordDto: ResetPasswordDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    await this.keycloak.client.users.resetPassword({
      id: keycloakUser.id,
      credential: {
        type: 'password',
        value: resetPasswordDto.password,
      },
    });

    if (resetPasswordDto.sendEmail) {
      await this.notifications.queueEmail({
        to: [keycloakUser.email],
        templateName: 'manager_password_reset',
        templateProps: {
          recipientFirstName: keycloakUser.firstName ?? '',
          password: resetPasswordDto.password,
          frontendUrl: this.config.get('FRONTEND_URL'),
        },
      });
    }

    return {
      success: true,
    };
  }

  async sendResetPasswordEmail(
    id: string,
    appClientId: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    await this.keycloak.client.users.resetPasswordEmail({
      id: keycloakUser.id,
      client_id: appClientId,
      redirect_uri: this.config.get('FRONTEND_URL'),
    });

    return {
      success: true,
    };
  }

  /**
   * Generates a cryptographically secure random password
   * @param length The length of the password to generate (default: 12)
   * @returns A secure random password string
   */
  generatePassword(length: number = 12) {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*()';

    const allChars =
      uppercaseChars + lowercaseChars + numberChars + specialChars;

    // Use Node.js crypto module for cryptographically secure random values
    let password = '';

    // Ensure at least one character from each character set
    password += uppercaseChars.charAt(crypto.randomInt(uppercaseChars.length));
    password += lowercaseChars.charAt(crypto.randomInt(lowercaseChars.length));
    password += numberChars.charAt(crypto.randomInt(numberChars.length));
    password += specialChars.charAt(crypto.randomInt(specialChars.length));

    // Fill the rest of the password with random characters
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(crypto.randomInt(allChars.length));
    }

    // Shuffle the password to avoid predictable character positions
    password = password
      .split('')
      .sort(() => crypto.randomInt(3) - 1)
      .join('');

    return { password };
  }

  private async getClient(
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    if (!isNil(clientId) && typeof clientId !== 'string') {
      return clientId;
    }

    let thisClientId = clientId;
    let prisma: PrismaClient;

    if (!thisClientId) {
      const prismaForUser = await this.prisma.forUser();
      thisClientId = prismaForUser.$currentUser()?.clientId;
      prisma = prismaForUser as unknown as PrismaClient;
    } else if (bypassRLS) {
      prisma = this.prisma.bypassRLS() as unknown as PrismaClient;
    } else {
      prisma = (await this.prisma.forContext()) as unknown as PrismaClient;
    }

    return prisma.client
      .findUniqueOrThrow({
        where: { id: thisClientId },
        include: {
          sites: true,
        },
      })
      .catch(as404OrThrow);
  }

  private async getKeycloakUser(
    id: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    const user = await this.keycloak
      .findUsersByAttribute({
        filter: {
          AND: [
            ...this.buildSiteFilters(client),
            { q: { key: 'user_id', value: id } },
          ],
        },
      })
      .then((r) => r.results.at(0));

    if (!user || !validateKeycloakUser(user)) {
      throw new NotFoundException();
    }

    return user;
  }

  private buildSiteFilters(
    client: Prisma.ClientGetPayload<{
      include: {
        sites: true;
      };
    }>,
  ) {
    const filters: CustomQueryFilter[] = [
      { q: { key: 'client_id', value: client.externalId } },
    ];

    const thisUser = this.cls.get('user');
    const isNonGlobal =
      !thisUser ||
      !['super-admin', 'global', 'client-sites'].includes(thisUser.visibility);
    if (isNonGlobal) {
      filters.push({
        q: {
          key: 'site_id',
          value: client.sites.map((s) => s.externalId),
          op: 'in',
        },
      });
    }

    return filters;
  }
}
