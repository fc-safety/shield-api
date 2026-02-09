import { NetworkError as KeycloakNetworkError } from '@keycloak/keycloak-admin-client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import crypto from 'crypto';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/enums';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakService,
    private readonly notifications: NotificationsService,
    private readonly config: ApiConfigService,
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

    // Shuffle the password to avoid predictable character positions
    password = password
      .split('')
      .sort(() => crypto.randomInt(3) - 1)
      .join('');

    return { password };
  }
}
