import { NetworkError as KeycloakNetworkError } from '@keycloak/keycloak-admin-client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Cache } from 'cache-manager';
import crypto from 'crypto';
import { databaseRoleToRole } from 'src/admin/roles/model/role';
import { RolesService } from 'src/admin/roles/roles.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { CustomQueryFilter } from 'src/auth/keycloak/types';
import { as404OrThrow, isNil } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma, PrismaClient } from 'src/generated/prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  personClientAccessToClientUser,
  validateKeycloakUser,
} from './model/client-user';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakService,
    private readonly roles: RolesService,
    private readonly cls: ApiClsService,
    private readonly notifications: NotificationsService,
    private readonly config: ApiConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Common include for user queries.
   */
  private get userInclude() {
    return {
      person: true,
      site: { select: { externalId: true } },
      client: { select: { externalId: true } },
      role: true,
    };
  }

  async findAll(query: QueryUserDto = new QueryUserDto()) {
    const prisma = await this.prisma.build();

    const result = await prisma.personClientAccess.findManyForPage(
      buildPrismaFindArgs<typeof prisma.personClientAccess>(query, {
        include: this.userInclude,
      }),
    );

    return {
      ...result,
      results: result.results.map(personClientAccessToClientUser),
    };
  }

  async findOne(id: string) {
    const prisma = await this.prisma.build();

    const personClientAccess = await prisma.personClientAccess
      .findFirstOrThrow({
        where: { personId: id },
        include: this.userInclude,
      })
      .catch(as404OrThrow);

    return personClientAccessToClientUser(personClientAccess);
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

    await this.keycloak.client.users
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

    // Sync changed fields to Person record
    const prisma = (bypassRLS
      ? this.prisma.bypassRLS()
      : await this.prisma.forViewContext()) as unknown as PrismaClient;

    const personUpdate: Prisma.PersonUpdateInput = {};
    if (updateUserDto.firstName !== undefined) {
      personUpdate.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      personUpdate.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.email !== undefined) {
      personUpdate.email = updateUserDto.email;
    }
    if (updateUserDto.phoneNumber !== undefined) {
      personUpdate.phoneNumber = updateUserDto.phoneNumber;
    }
    if (updateUserDto.position !== undefined) {
      personUpdate.position = updateUserDto.position;
    }
    if (updateUserDto.active !== undefined) {
      personUpdate.active = updateUserDto.active;
    }

    if (Object.keys(personUpdate).length > 0) {
      await prisma.person.update({
        where: { id },
        data: personUpdate,
      });
    }
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
   * Add a role to a user. Since PersonClientAccess supports one role per client,
   * this will replace the existing role if one exists.
   */
  async addRole(
    id: string,
    addRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
  ) {
    const client = await this.getClient(clientId);

    const prisma = await this.prisma.build();

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

    // Invalidate cache (id is idpId in this method)
    await this.invalidatePersonClientAccessCache({
      idpId: id,
      clientExternalId: client.externalId,
      personId: person.id,
      clientId: client.id,
    });

    return databaseRoleToRole(role);
  }

  /**
   * Remove a specific role from a user.
   * This removes the PersonClientAccess entry for this client.
   */
  async removeRole(
    id: string,
    removeRoleDto: { roleId: string },
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
  ) {
    const client = await this.getClient(clientId);
    await this.getKeycloakUser(id, clientId); // Verify user exists

    const prisma = await this.prisma.build();

    // Get person's idpId for cache invalidation
    const person = await prisma.person.findUnique({
      where: { id },
      select: { idpId: true },
    });

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

    // Invalidate cache
    await this.invalidatePersonClientAccessCache({
      idpId: person?.idpId ?? null,
      clientExternalId: client.externalId,
      personId: id,
      clientId: client.id,
    });

    return removeRoleDto.roleId;
  }

  async resetPassword(
    id: string,
    resetPasswordDto: ResetPasswordDto,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId);

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
  ) {
    const keycloakUser = await this.getKeycloakUser(id, clientId);

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
  ) {
    if (!isNil(clientId) && typeof clientId !== 'string') {
      return clientId;
    }

    const prisma = await this.prisma.build();

    return prisma.client
      .findUniqueOrThrow({
        where: { id: clientId ?? this.cls.requireAccessGrant().clientId },
        include: {
          sites: true,
        },
      })
      .catch(as404OrThrow);
  }

  private async getKeycloakUser(
    id: string,
    clientId?: string | Prisma.ClientGetPayload<{ include: { sites: true } }>,
  ) {
    const client = await this.getClient(clientId);
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

  /**
   * Invalidate all caches related to a person's client access.
   * This includes caches in both ClientsService and PeopleService.
   */
  private async invalidatePersonClientAccessCache(params: {
    idpId: string | null;
    clientExternalId: string;
    personId: string;
    clientId: string;
  }) {
    const { idpId, clientExternalId, personId, clientId } = params;

    // Only invalidate caches that use idpId if we have it
    const cacheKeys = [
      // PeopleService.getSwitchedClientContext cache
      `person-switched:${personId}:${clientExternalId}`,
      // PeopleService.getPrimaryClientRole cache
      `person-primary-role:${personId}:${clientId}`,
    ];

    if (idpId) {
      cacheKeys.push(
        // ClientsService.validateClientAccess cache
        `client-access:${idpId}:${clientExternalId}`,
        // PeopleService.getPersonRepresentation cache (primary client)
        `person:idpId=${idpId}`,
        // PeopleService.getPrimaryClientAccess cache
        `primary-client-access:${idpId}`,
      );
    }

    await Promise.all(cacheKeys.map((key) => this.cache.del(key)));
  }
}
