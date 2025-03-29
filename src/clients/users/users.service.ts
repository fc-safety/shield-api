import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { RolesService } from 'src/admin/roles/roles.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { CustomQueryFilter } from 'src/auth/keycloak/types';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow, ViewContext } from 'src/common/utils';
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
    private readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    clientId?: string,
    viewContext?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, viewContext, bypassRLS);
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
    return this.findOne(newId, clientId, viewContext);
  }

  async findAll(
    queryUserDto: QueryUserDto = new QueryUserDto(),
    clientId?: string,
    viewContext?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, viewContext, bypassRLS);

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
    clientId?: string,
    viewContext?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(
      id,
      clientId,
      viewContext,
      bypassRLS,
    );
    return keycloakUserAsClientUser(keycloakUser);
  }
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    clientId?: string,
    viewContext?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(
      id,
      clientId,
      viewContext,
      bypassRLS,
    );

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

  async assignRole(
    id: string,
    assignRoleDto: AssignRoleDto,
    clientId?: string,
    viewContext?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const keycloakUser = await this.getKeycloakUser(
      id,
      clientId,
      viewContext,
      bypassRLS,
    );

    // Get all role groups to check existing memberships and remove them. A user can only have one role.
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

  private async getClient(
    clientId?: string,
    context?: ViewContext,
    bypassRLS?: boolean,
  ) {
    let thisClientId = clientId;
    let prisma: ReturnType<typeof this.prisma.extended>;

    if (!thisClientId) {
      const prismaForUser = await this.prisma.forUser();
      thisClientId = prismaForUser.$currentUser().clientId;
      prisma = prismaForUser;
    } else if (bypassRLS) {
      prisma = this.prisma.bypassRLS();
    } else {
      prisma = await (context
        ? this.prisma.forContext(context)
        : this.prisma.forAdminOrUser());
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
    clientId?: string,
    context?: ViewContext,
    bypassRLS?: boolean,
  ) {
    const client = await this.getClient(clientId, context, bypassRLS);
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
      !thisUser || !['global', 'client-sites'].includes(thisUser.visibility);
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
