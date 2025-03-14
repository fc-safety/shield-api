import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { RolesService } from 'src/admin/roles/roles.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { as404OrThrow } from 'src/common/utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { asFilterConditions, QueryUserDto } from './dto/query-user.dto';
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
  ) {}

  async create(clientId: string, createUserDto: CreateUserDto) {
    const client = await this.getClient(clientId);
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
    );

    await this.keycloak.client.users.create({
      enabled: createUserDto.active ?? true,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      username: createUserDto.email,
      email: createUserDto.email,
      emailVerified: true,
      attributes,
    });
    return this.findOne(clientId, newId);
  }

  async findAll(
    clientId: string,
    queryUserDto: QueryUserDto = new QueryUserDto(),
  ) {
    const client = await this.getClient(clientId);

    const { offset, limit } = queryUserDto;
    return this.keycloak
      .findUsersByAttribute({
        filter: {
          AND: [
            { q: { key: 'client_id', value: client.externalId } },
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

  async findOne(clientId: string, id: string) {
    const keycloakUser = await this.getKeycloakUser(clientId, id);
    return keycloakUserAsClientUser(keycloakUser);
  }

  async update(clientId: string, id: string, updateUserDto: UpdateUserDto) {
    const keycloakUser = await this.getKeycloakUser(clientId, id);

    const attributes = KeycloakService.mergeAttributes(
      keycloakUser.attributes,
      ['phone_number', updateUserDto.phoneNumber],
      ['site_id', updateUserDto.siteExternalId],
      ['user_updated_at', new Date().toISOString()],
      ['user_position', updateUserDto.position],
    );

    return this.keycloak.client.users.update(
      {
        id: keycloakUser.id,
      },
      {
        enabled: updateUserDto.active ?? keycloakUser.enabled,
        firstName: updateUserDto.firstName ?? keycloakUser.firstName,
        lastName: updateUserDto.lastName ?? keycloakUser.lastName,
        username: updateUserDto.email ?? keycloakUser.username,
        email: updateUserDto.email ?? keycloakUser.email,
        attributes,
      },
    );
  }

  async assignRole(clientId: string, id: string, assignRoleDto: AssignRoleDto) {
    const keycloakUser = await this.getKeycloakUser(clientId, id);
    const keycloakRoleGroup = await this.roles.getRoleGroup(
      assignRoleDto.roleId,
    );
    return this.keycloak.client.users.addToGroup({
      id: keycloakUser.id,
      groupId: keycloakRoleGroup.id,
    });
  }

  private async getClient(clientId: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) =>
        prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      )
      .catch(as404OrThrow);
  }

  private async getKeycloakUser(clientId: string, id: string) {
    const client = await this.getClient(clientId);
    const user = await this.keycloak
      .findUsersByAttribute({
        filter: {
          AND: [
            { q: { key: 'client_id', value: client.externalId } },
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
}
