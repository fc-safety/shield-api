import { NetworkError as KeycloakNetworkError } from '@keycloak/keycloak-admin-client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { ClsService } from 'nestjs-cls';
import {
  DatabaseRole,
  databaseRoleToRole,
  Role,
} from 'src/admin/roles/model/role';
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

    const initialPassword =
      createUserDto.password ?? this.generatePassword(24).password;

    await this.keycloak.client.users
      .create({
        enabled: createUserDto.active ?? true,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        username: createUserDto.email,
        email: createUserDto.email,
        emailVerified: true,
        attributes,
        // Make sure user is created with initial password even if it's randomly
        // generated, else Keycloak won't allow the user to reset the password
        // on their own.
        credentials: [
          {
            type: 'password',
            value: initialPassword,
          },
        ],
      })
      .catch((e) => {
        if (e instanceof KeycloakNetworkError && e.response.status === 409) {
          throw new ConflictException(e.message);
        }
        throw e;
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
    const keycloakResponse = await this.keycloak.findUsersByAttribute({
      filter: {
        AND: [
          ...this.buildSiteFilters(client),
          ...asFilterConditions(queryUserDto),
        ],
      },
      limit,
      offset,
    });

    const validUsers = keycloakResponse.results.filter(validateKeycloakUser);

    // Get all user IDs to batch lookup roles
    const userIds = validUsers.map((u) => u.attributes.user_id[0]);

    // Load roles for all users from database via PersonClientAccess
    const userRolesMap = await this.getUserRolesFromDatabase(
      userIds,
      client.id,
      bypassRLS,
    );

    const cleanedUsers = validUsers.map((user) => {
      const userId = user.attributes.user_id[0];
      const roles = userRolesMap.get(userId) ?? [];
      return keycloakUserAsClientUser(user, roles);
    });

    return {
      ...keycloakResponse,
      limit: cleanedUsers.length,
      results: cleanedUsers,
    };
  }

  async findOne(
    id: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    const keycloakUser = await this.getKeycloakUser(id, clientId, bypassRLS);

    // Load role from database via PersonClientAccess
    const userRolesMap = await this.getUserRolesFromDatabase(
      [id],
      client.id,
      bypassRLS,
    );
    const roles = userRolesMap.get(id) ?? [];

    return keycloakUserAsClientUser(keycloakUser, roles);
  }

  /**
   * Batch load roles for users from database via PersonClientAccess.
   */
  private async getUserRolesFromDatabase(
    userIds: string[],
    clientId: string,
    bypassRLS?: boolean,
  ): Promise<Map<string, Role[]>> {
    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forContext()) as unknown as PrismaClient;

    // Find all persons by their internal user IDs and get their roles
    const personsWithRoles = await prisma.person.findMany({
      where: {
        id: { in: userIds },
      },
      include: {
        clientAccess: {
          where: { clientId },
          include: { role: true },
        },
      },
    });

    const roleMap = new Map<string, Role[]>();
    for (const person of personsWithRoles) {
      const roles = person.clientAccess.map((pca) =>
        databaseRoleToRole(pca.role as DatabaseRole),
      );
      roleMap.set(person.id, roles);
    }

    return roleMap;
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

    return this.keycloak.client.users
      .update(
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
      )
      .catch((e) => {
        if (e instanceof KeycloakNetworkError && e.response.status === 409) {
          throw new ConflictException(e.message);
        }
        throw e;
      });
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
   * Now updates the database via PersonClientAccess instead of Keycloak groups.
   */
  async assignRole(
    id: string,
    assignRoleDto: AssignRoleDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    await this.getKeycloakUser(id, clientId, bypassRLS); // Verify user exists

    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forContext()) as unknown as PrismaClient;

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: assignRoleDto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${assignRoleDto.roleId} not found`);
    }

    // Update or create PersonClientAccess with the new role
    await prisma.personClientAccess.upsert({
      where: {
        personId_clientId: {
          personId: id,
          clientId: client.id,
        },
      },
      update: {
        roleId: assignRoleDto.roleId,
      },
      create: {
        personId: id,
        clientId: client.id,
        siteId: client.sites[0]?.id ?? '',
        roleId: assignRoleDto.roleId,
      },
    });
  }

  /**
   * Add a role to a user. Since PersonClientAccess supports one role per client,
   * this will replace the existing role if one exists.
   */
  async addRole(
    id: string,
    addRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);

    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forContext()) as unknown as PrismaClient;

    const person = await prisma.person.findUnique({
      where: { idpId: id },
    });

    if (!person) {
      throw new NotFoundException(`Person ${id} not found`);
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: addRoleDto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${addRoleDto.roleId} not found`);
    }

    // Check if user already has this role
    const existing = await prisma.personClientAccess.findUnique({
      where: {
        personId_clientId: {
          personId: id,
          clientId: client.id,
        },
      },
    });

    if (existing?.roleId === addRoleDto.roleId) {
      throw new BadRequestException(
        `User already has role ${addRoleDto.roleId}`,
      );
    }

    // Update or create PersonClientAccess with the role
    await prisma.personClientAccess.upsert({
      where: {
        personId_clientId: {
          personId: person.id,
          clientId: client.id,
        },
      },
      update: {
        roleId: addRoleDto.roleId,
      },
      create: {
        personId: person.id,
        clientId: client.id,
        siteId: client.sites[0]?.id ?? '',
        roleId: addRoleDto.roleId,
      },
    });

    return databaseRoleToRole(role as DatabaseRole);
  }

  /**
   * Remove a specific role from a user.
   * This removes the PersonClientAccess entry for this client.
   */
  async removeRole(
    id: string,
    removeRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    await this.getKeycloakUser(id, clientId, bypassRLS); // Verify user exists

    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forContext()) as unknown as PrismaClient;

    // Check if user has this role
    const existing = await prisma.personClientAccess.findUnique({
      where: {
        personId_clientId: {
          personId: id,
          clientId: client.id,
        },
      },
    });

    if (!existing || existing.roleId !== removeRoleDto.roleId) {
      throw new BadRequestException(
        `User does not have role ${removeRoleDto.roleId}`,
      );
    }

    // Remove the PersonClientAccess entry
    await prisma.personClientAccess.delete({
      where: {
        personId_clientId: {
          personId: id,
          clientId: client.id,
        },
      },
    });

    return removeRoleDto.roleId;
  }

  /**
   * Set the exact role for a user in a client.
   * Since PersonClientAccess supports one role per client, this sets that role.
   */
  async setRoles(
    id: string,
    setRolesDto: { roleIds: string[] },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, bypassRLS);
    await this.getKeycloakUser(id, clientId, bypassRLS); // Verify user exists

    // PersonClientAccess supports one role per client, so we take the first role ID
    // or remove access if no roles specified
    const roleId = setRolesDto.roleIds[0];

    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forContext()) as unknown as PrismaClient;

    if (!roleId) {
      // No roles specified - remove access
      await prisma.personClientAccess.deleteMany({
        where: {
          personId: id,
          clientId: client.id,
        },
      });
      return;
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    // Update or create PersonClientAccess with the role
    await prisma.personClientAccess.upsert({
      where: {
        personId_clientId: {
          personId: id,
          clientId: client.id,
        },
      },
      update: {
        roleId,
      },
      create: {
        personId: id,
        clientId: client.id,
        siteId: client.sites[0]?.id ?? '',
        roleId,
      },
    });
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
    // Check if user has scope that allows access to multiple sites
    const hasMultiSiteAccess = thisUser?.scopeAllows('CLIENT') ?? false;
    if (!hasMultiSiteAccess) {
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
