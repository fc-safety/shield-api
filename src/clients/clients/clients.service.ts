import { BadRequestException, Injectable } from '@nestjs/common';
import { RolesService } from 'src/admin/roles/roles.service';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { UsersService } from '../users/users.service';
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
  ) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.client.create({ data: createClientDto }));
  }

  async findAll(queryClientDto: QueryClientDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.client.findManyForPage(
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
    return this.prisma.forContext().then((prisma) =>
      prisma.client
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
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.client
        .update({
          where: { id },
          data: updateClientDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma.forAdminOrUser().then(async (prisma) => {
      const client = await prisma.client.findUniqueOrThrow({
        where: { id },
        include: { sites: true },
      });
      const result = await prisma.client.delete({ where: { id } });

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
    return this.prisma.forAdminOrUser().then(async (prisma) =>
      prisma.$transaction(async (prisma) => {
        const existingClient = await prisma.client
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

        const duplicateClient = await prisma.client.create({
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
        await Promise.all(
          sites.map(async (site) => {
            const {
              primary,
              name,
              address: { id: _oldAddressId, ...address },
              phoneNumber,
            } = site;
            const duplicateSite = await prisma.site.create({
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

            await prisma.site.update({
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

            await prisma.asset.create({
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

        await Promise.all(
          users.map(async (user) => {
            const newEmail =
              user.email.split('@')[0] + '@' + options.emailDomain;

            const newUser = await this.usersService.create(
              CreateUserDto.create({
                email: newEmail,
                firstName: user.firstName,
                lastName: user.lastName,
                siteExternalId: user.siteExternalId,
                phoneNumber: user.phoneNumber,
                position: user.position,
              }),
              duplicateClient,
            );

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

        return duplicateClient;
      }),
    );
  }
}
