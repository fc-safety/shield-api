import { BadRequestException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import pRetry from 'p-retry';
import { RolesService } from 'src/admin/roles/roles.service';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { UsersService } from '../users/users.service';
import { ClearDemoInspectionsQueryDto } from './dto/clear-demo-inspections-query.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { DuplicateDemoClientDto } from './dto/duplicate-demo-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma.txForAdminOrUser((tx) =>
      tx.client.create({ data: createClientDto }),
    );
  }

  async findAll(queryClientDto: QueryClientDto) {
    return this.prisma.txForContext((tx) =>
      tx.client.findManyForPage(
        buildPrismaFindArgs<typeof this.prisma.client>(queryClientDto, {
          include: {
            address: true,
            _count: {
              select: { sites: true },
            },
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.txForContext((tx) =>
      tx.client
        .findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            sites: {
              include: {
                address: true,
                _count: { select: { subsites: true } },
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    return this.prisma.txForAdminOrUser((tx) =>
      tx.client
        .update({
          where: { id },
          data: updateClientDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma.txForAdminOrUser(async (tx) => {
      const client = await tx.client.findUniqueOrThrow({
        where: { id },
        include: { sites: true },
      });
      const result = await tx.client.delete({ where: { id } });

      const users = await this.usersService
        .findAll(
          QueryUserDto.create({
            limit: 5000,
          }),
          client,
        )
        .then((users) => users.results);

      await Promise.all(
        users.map((user) => this.usersService.remove(user.id, client)),
      );

      return result;
    });
  }

  async duplicateDemo(id: string, options: DuplicateDemoClientDto) {
    return this.prisma.txForAdminOrUser(async (tx) => {
      const existingClient = await tx.client
        .findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            sites: {
              include: {
                address: true,
              },
            },
            assets: {
              include: {
                tag: true,
              },
            },
          },
        })
        .catch(as404OrThrow);

      if (!existingClient.demoMode) {
        throw new BadRequestException(
          'Client must be in demo mode to perform this action.',
        );
      }

      const {
        status,
        startedOn,
        phoneNumber,
        homeUrl,
        defaultInspectionCycle,
        address: { id: _oldAddressId, ...address },
        sites,
      } = existingClient;

      const duplicateClient = await tx.client.create({
        data: {
          name: options.name,
          status,
          startedOn,
          phoneNumber,
          homeUrl,
          defaultInspectionCycle,
          address: {
            create: address,
          },
          demoMode: true,
        },
        include: {
          sites: true,
        },
      });

      const siteIdsMap = new Map<string, string>();
      const siteExternalIdsMap = new Map<string, string>();
      await Promise.all(
        sites.map(async (site) => {
          const {
            primary,
            name,
            address: { id: _oldAddressId, ...address },
            phoneNumber,
          } = site;
          const duplicateSite = await tx.site.create({
            data: {
              primary,
              name,
              phoneNumber,
              address: {
                create: address,
              },
              client: {
                connect: {
                  id: duplicateClient.id,
                },
              },
            },
          });
          siteIdsMap.set(site.id, duplicateSite.id);
          siteExternalIdsMap.set(site.externalId, duplicateSite.externalId);
        }),
      );

      await Promise.all(
        sites.map(async (site) => {
          const duplicateSiteId = siteIdsMap.get(site.id);
          if (!duplicateSiteId || !site.parentSiteId) {
            return;
          }

          const duplicateParentSiteId = siteIdsMap.get(site.parentSiteId);
          if (!duplicateParentSiteId) {
            return;
          }

          await tx.site.update({
            where: { id: duplicateSiteId },
            data: {
              parentSiteId: duplicateParentSiteId,
            },
          });
        }),
      );

      Promise.all(
        existingClient.assets.map(async (asset) => {
          const {
            name,
            active,
            productId,
            location,
            placement,
            serialNumber,
            inspectionCycle,
            tag,
          } = asset;

          const siteId = siteIdsMap.get(asset.siteId);
          if (!siteId) {
            return;
          }

          await tx.asset.create({
            data: {
              name,
              active,
              product: {
                connect: {
                  id: productId,
                },
              },
              location,
              placement,
              serialNumber,
              inspectionCycle,
              site: {
                connect: {
                  id: siteId,
                },
              },
              client: {
                connect: {
                  id: duplicateClient.id,
                },
              },
              tag: tag
                ? {
                    create: {
                      siteId,
                      clientId: duplicateClient.id,
                      serialNumber: tag.serialNumber,
                    },
                  }
                : undefined,
            },
          });
        }),
      );

      const query = QueryUserDto.create({
        limit: 1000,
      });
      const users = await this.usersService
        .findAll(query, existingClient)
        .then((users) => users.results);
      const roles = await this.rolesService.getRoles();
      const roleNameMap = new Map<string, string>(
        roles.map((role) => [role.name, role.id]),
      );

      const newUserIds: string[] = [];

      try {
        await Promise.all(
          users.map(async (user) => {
            const newEmail =
              user.email.split('@')[0] + '@' + options.emailDomain;

            const newUser = await this.usersService.create(
              CreateUserDto.create({
                email: newEmail,
                firstName: user.firstName,
                lastName: user.lastName,
                siteExternalId: siteExternalIdsMap.get(user.siteExternalId),
                phoneNumber: user.phoneNumber,
                position: user.position,
                password: options.password,
              }),
              duplicateClient,
            );
            newUserIds.push(newUser.id);

            if (!user.roleName) {
              return;
            }

            const roleId = roleNameMap.get(user.roleName);
            if (!roleId) {
              return;
            }

            await this.usersService.assignRole(
              newUser.id,
              AssignRoleDto.create({ roleId }),
              duplicateClient,
            );
          }),
        );
      } catch (e) {
        await Promise.all(
          newUserIds.map((userId) =>
            pRetry(() => this.usersService.remove(userId, duplicateClient), {
              retries: 3,
            }),
          ),
        );

        throw e;
      }

      return duplicateClient;
    });
  }

  async clearInspectionsForDemoClient(query: ClearDemoInspectionsQueryDto) {
    let uniqueWhere: Prisma.ClientWhereUniqueInput;

    if (query.clientId) {
      uniqueWhere = { id: query.clientId };
    } else {
      const user = this.cls.get('user');
      if (!user) {
        throw new BadRequestException('User not found');
      }
      uniqueWhere = { externalId: user.clientId };
    }

    return this.prisma.txForAdminOrUser(async (tx) => {
      const client = await tx.client
        .findUniqueOrThrow({
          where: {
            ...uniqueWhere,
          },
          select: {
            id: true,
            demoMode: true,
          },
        })
        .catch(as404OrThrow);

      if (!client.demoMode) {
        throw new BadRequestException(
          'Client must be in demo mode to perform this action.',
        );
      }

      await tx.inspection.deleteMany({
        where: {
          clientId: client.id,
          createdOn: {
            gte: query.startDate,
            lte: query.endDate ?? undefined,
          },
        },
      });
    });
  }
}
