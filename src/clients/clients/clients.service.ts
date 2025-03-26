import { Injectable } from '@nestjs/common';
import { TVisibility, VISIBILITY_VALUES } from 'src/auth/permissions';
import { as404OrThrow, ViewContext } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { extensions, PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.client.create({ data: createClientDto }));
  }

  async findAll(queryClientDto: QueryClientDto, context: ViewContext) {
    return this.prisma.forContext(context).then((prisma) =>
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
    return this.prisma.forAdminOrUser().then((prisma) =>
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
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.client.delete({ where: { id } }));
  }

  async getAssetVisibilityMappings(id: string) {
    const sites = await this.prisma.bypassRLS().site.findMany({
      select: { id: true, externalId: true, name: true },
      where: { clientId: id },
    });

    const assetVisibilityMappings: Record<
      Exclude<TVisibility, 'global'>,
      {
        siteId: string;
        siteExternalId: string;
        siteName: string;
        assetIds: string[];
      }[]
    > = {
      'client-sites': [],
      'multi-site': [],
      'site-group': [],
      'single-site': [],
      self: [],
    };

    for (const visibility of VISIBILITY_VALUES) {
      if (visibility === 'global') {
        continue;
      }

      for (const site of sites) {
        const assetIds = await this.prisma
          .$extends(
            extensions.forUser({
              id: '1',
              idpId: '1',
              siteId: site.id,
              allowedSiteIds: site.id, // This accepts a comma-delimited list of site IDs.
              clientId: id,
              visibility,
            }),
          )
          .asset.findMany({
            select: {
              id: true,
            },
          })
          .then((assets) => assets.map((a) => a.id));
        assetVisibilityMappings[visibility].push({
          siteId: site.id,
          siteExternalId: site.externalId,
          siteName: site.name,
          assetIds,
        });
      }
    }

    return assetVisibilityMappings;
  }
}
