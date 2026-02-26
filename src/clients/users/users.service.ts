import { NetworkError as KeycloakNetworkError } from '@keycloak/keycloak-admin-client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { clearAccessGrantResponseCache } from 'src/auth/utils/access-grants';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/enums';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddUserRoleDto } from './dto/add-user-role.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RemoveUserRoleDto } from './dto/remove-user-role.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Response model for user queries.
 * Returns Person with nested clientAccess containing site/client/role info.
 */
export interface UserResponse {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  position: string | null;
  active: boolean;
  idpId: string | null;
  clientAccess: Array<{
    id: string;
    isPrimary: boolean;
    client: { id: string; externalId: string; name: string };
    site: { id: string; externalId: string; name: string };
    role: { id: string; name: string; scope: RoleScope };
  }>;
}

/**
 * Include configuration for Person queries with clientAccess relation.
 */
const personInclude = {
  clientAccess: {
    include: {
      client: { select: { id: true, externalId: true, name: true } },
      site: { select: { id: true, externalId: true, name: true } },
      role: { select: { id: true, name: true, scope: true } },
    },
  },
};

/**
 * UsersService - System admin only service for managing all users.
 *
 * This service provides full visibility over all users in the system.
 * The Person table is the source of truth, with Keycloak used only for
 * password operations.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakService,
    private readonly notifications: NotificationsService,
    private readonly config: ApiConfigService,
    private readonly memoryCache: MemoryCacheService,
  ) {}

  /**
   * List all users with optional filters.
   * Uses bypassRLS since this is admin-only.
   */
  async findAll(query: QueryUserDto = new QueryUserDto()) {
    const prisma = this.prisma.bypassRLS();

    return prisma.person.findManyForPage(
      buildPrismaFindArgs<typeof prisma.person>(query, {
        include: personInclude,
      }),
    );
  }

  /**
   * Get a single user by ID with all their client access entries.
   */
  async findOne(id: string): Promise<UserResponse> {
    const prisma = this.prisma.bypassRLS();

    return prisma.person
      .findUniqueOrThrow({
        where: { id },
        include: personInclude,
      })
      .catch(as404OrThrow);
  }

  /**
   * Update a user's profile information.
   * Syncs changes to Keycloak if the user has an IDP account.
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const prisma = this.prisma.bypassRLS();

    // Find the person first
    const person = await prisma.person
      .findUniqueOrThrow({ where: { id } })
      .catch(as404OrThrow);

    return prisma.$transaction(async (tx) => {
      // Update Person record in database
      const updatedPerson = await tx.person.update({
        where: { id },
        data: {
          ...(updateUserDto.firstName !== undefined && {
            firstName: updateUserDto.firstName,
          }),
          ...(updateUserDto.lastName !== undefined && {
            lastName: updateUserDto.lastName,
          }),
          ...(updateUserDto.email !== undefined && {
            email: updateUserDto.email,
          }),
          ...(updateUserDto.phoneNumber !== undefined && {
            phoneNumber: updateUserDto.phoneNumber,
          }),
          ...(updateUserDto.active !== undefined && {
            active: updateUserDto.active,
          }),
        },
        include: personInclude,
      });

      // Then sync to Keycloak if the person has an IDP account.
      if (person.idpId) {
        try {
          await this.keycloak.client.users.update(
            { id: person.idpId },
            {
              enabled: updateUserDto.active ?? person.active,
              firstName: updateUserDto.firstName ?? person.firstName,
              lastName: updateUserDto.lastName ?? person.lastName,
              email: updateUserDto.email ?? person.email,
              // Keep username in sync with email if they were the same
              username:
                person.username === person.email
                  ? (updateUserDto.email ?? person.email)
                  : (person.username ?? person.email),
              attributes: KeycloakService.mergeAttributes(
                {},
                [
                  'phone_number',
                  updateUserDto.phoneNumber ?? person.phoneNumber,
                ],
                ['user_updated_at', new Date().toISOString()],
              ),
            },
          );
        } catch (e) {
          if (e instanceof KeycloakNetworkError && e.response.status === 409) {
            throw new ConflictException(
              'Email or username already exists in identity provider',
            );
          }
          throw e;
        }
      }

      return updatedPerson;
    });
  }

  /**
   * Reset a user's password via Keycloak.
   * Optionally sends an email with the new password.
   */
  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    const prisma = this.prisma.bypassRLS();

    const person = await prisma.person
      .findUniqueOrThrow({ where: { id } })
      .catch(as404OrThrow);

    if (!person.idpId) {
      throw new BadRequestException('User has no identity provider account');
    }

    await this.keycloak.client.users.resetPassword({
      id: person.idpId,
      credential: {
        type: 'password',
        value: resetPasswordDto.password,
      },
    });

    if (resetPasswordDto.sendEmail) {
      await this.notifications.queueEmail({
        to: [person.email],
        templateName: 'manager_password_reset',
        templateProps: {
          recipientFirstName: person.firstName,
          password: resetPasswordDto.password,
          frontendUrl: this.config.get('FRONTEND_URL'),
        },
      });
    }

    return { success: true };
  }

  /**
   * Send a password reset email via Keycloak.
   */
  async sendResetPasswordEmail(id: string, appClientId: string) {
    const prisma = this.prisma.bypassRLS();

    const person = await prisma.person
      .findUniqueOrThrow({ where: { id } })
      .catch(as404OrThrow);

    if (!person.idpId) {
      throw new BadRequestException('User has no identity provider account');
    }

    await this.keycloak.client.users.resetPasswordEmail({
      id: person.idpId,
      client_id: appClientId,
      redirect_uri: this.config.get('FRONTEND_URL'),
    });

    return { success: true };
  }

  /**
   * Add a role (client/site/role combination) to a user.
   * Works across clients — the clientId is provided in the DTO.
   */
  async addRole(id: string, dto: AddUserRoleDto) {
    const prisma = this.prisma.bypassRLS();

    // Verify user exists
    const person = await prisma.person
      .findUniqueOrThrow({
        where: { id },
        select: { id: true, idpId: true },
      })
      .catch(as404OrThrow);

    // Validate site belongs to the specified client
    const site = await prisma.site.findFirst({
      where: { id: dto.siteId, clientId: dto.clientId },
    });
    if (!site) {
      throw new NotFoundException(
        `Site with ID ${dto.siteId} not found for client ${dto.clientId}`,
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
    }

    // Determine isPrimary
    const existingPrimaryAccess = await prisma.personClientAccess.findFirst({
      where: { personId: person.id, isPrimary: true },
    });

    const isPrimary =
      !existingPrimaryAccess ||
      (existingPrimaryAccess.clientId === dto.clientId &&
        existingPrimaryAccess.siteId === dto.siteId);

    // Upsert PersonClientAccess
    const clientAccess = await prisma.personClientAccess.upsert({
      where: {
        personId_clientId_siteId_roleId: {
          personId: person.id,
          clientId: dto.clientId,
          siteId: dto.siteId,
          roleId: dto.roleId,
        },
      },
      update: { isPrimary },
      create: {
        personId: person.id,
        clientId: dto.clientId,
        siteId: dto.siteId,
        roleId: dto.roleId,
        isPrimary,
      },
      include: {
        client: { select: { id: true, externalId: true, name: true } },
        site: { select: { id: true, externalId: true, name: true } },
        role: { select: { id: true, name: true, scope: true } },
      },
    });

    // Invalidate cache
    if (person.idpId) {
      await clearAccessGrantResponseCache({
        idpId: person.idpId,
        clientId: dto.clientId,
        siteId: dto.siteId,
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while adding user role',
          e,
        ),
      );
    }

    return clientAccess;
  }

  /**
   * Remove a role (client/site/role combination) from a user.
   * Works across clients — the clientId is provided in the DTO.
   */
  async removeRole(id: string, dto: RemoveUserRoleDto) {
    const prisma = this.prisma.bypassRLS();

    // Verify user exists
    const person = await prisma.person
      .findUniqueOrThrow({
        where: { id },
        select: { id: true, idpId: true },
      })
      .catch(as404OrThrow);

    await prisma.$transaction(async (tx) => {
      const clientAccess = await tx.personClientAccess.findFirst({
        where: {
          personId: id,
          clientId: dto.clientId,
          roleId: dto.roleId,
          siteId: dto.siteId,
        },
      });

      if (!clientAccess) {
        throw new NotFoundException(
          'User does not have this client/site/role combination',
        );
      }

      // Delete the PersonClientAccess
      await tx.personClientAccess.delete({
        where: { id: clientAccess.id },
      });

      // If the deleted row was primary, promote the oldest remaining
      if (clientAccess.isPrimary) {
        const remainingPrimary = await tx.personClientAccess.findFirst({
          where: { personId: id, isPrimary: true },
        });

        if (!remainingPrimary) {
          const oldestRemaining = await tx.personClientAccess.findFirst({
            where: { personId: id },
            orderBy: { createdOn: 'asc' },
            select: { id: true, clientId: true, siteId: true },
          });

          if (oldestRemaining) {
            await tx.personClientAccess.updateMany({
              where: {
                personId: id,
                clientId: oldestRemaining.clientId,
                siteId: oldestRemaining.siteId,
              },
              data: { isPrimary: true },
            });
          }
        }
      }

    });

    // Invalidate cache
    if (person.idpId) {
      await clearAccessGrantResponseCache({
        idpId: person.idpId,
        clientId: dto.clientId,
        siteId: dto.siteId,
        deleteFn: (keys) => this.memoryCache.mdel(keys),
      }).catch((e) =>
        this.logger.error(
          'Error invalidating access grant cache while removing user role',
          e,
        ),
      );
    }

    return { success: true };
  }

  /**
   * Generates a cryptographically secure random password.
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

    // Fisher-Yates shuffle for an unbiased permutation
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    password = chars.join('');

    return { password };
  }
}
