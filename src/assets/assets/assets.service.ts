import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryAlertDto } from '../alerts/dto/query-alert.dto';
import { ResolveAlertDto } from '../alerts/dto/resolve-alert.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { SetupAssetDto } from './dto/setup-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateSetupAssetDto } from './dto/update-setup-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssetDto: Prisma.AssetCreateInput) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.asset.create({ data: createAssetDto }));
  }

  async findAll(queryAssetDto?: QueryAssetDto) {
    return this.prisma.forUser().then(async (prisma) =>
      prisma.asset.findManyForPage(
        buildPrismaFindArgs<typeof prisma.asset>(queryAssetDto, {
          include: {
            product: {
              include: {
                manufacturer: true,
                productCategory: true,
              },
            },
            tag: true,
            alerts: {
              where: { resolved: false },
              select: { id: true, alertLevel: true },
            },
            inspections: {
              take: 1,
              orderBy: { createdOn: 'desc' },
            },
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.asset.findUniqueOrThrow({
          where: { id },
          include: {
            product: {
              include: {
                manufacturer: true,
                productCategory: true,
              },
            },
            inspections: {
              include: {
                inspector: true,
              },
            },
            setupQuestionResponses: {
              include: {
                assetQuestion: true,
              },
            },
            consumables: {
              include: {
                product: true,
              },
            },
            alerts: true,
            tag: true,
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async addTag(id: string, tagSerialNumber: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.asset.update({
          where: { id },
          data: {
            tag: {
              connectOrCreate: {
                where: { serialNumber: tagSerialNumber },
                create: { serialNumber: tagSerialNumber },
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findOneAlert(id: string, alertId: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.alert.findUniqueOrThrow({
          where: {
            id: alertId,
            assetId: id,
          },
          include: {
            asset: {
              include: {
                product: true,
              },
            },
            assetAlertCriterion: true,
            assetQuestionResponse: {
              include: {
                assetQuestion: true,
              },
            },
            inspection: {
              include: {
                inspector: true,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findAlerts(id: string, queryAlertDto?: QueryAlertDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.alert.findManyForPage(
        buildPrismaFindArgs<typeof prisma.alert>(queryAlertDto, {
          where: {
            assetId: id,
          },
          include: {
            asset: {
              include: {
                product: true,
              },
            },
            assetAlertCriterion: true,
            assetQuestionResponse: {
              include: {
                assetQuestion: true,
              },
            },
          },
        }),
      ),
    );
  }

  async resolveAlert(
    id: string,
    alertId: string,
    resolveAlertDto: ResolveAlertDto,
  ) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.alert.update({
          where: {
            id: alertId,
            assetId: id,
            resolved: false,
          },
          data: {
            ...resolveAlertDto,
            resolved: true,
            resolvedOn: new Date(),
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.asset
        .update({
          where: { id },
          data: updateAssetDto,
        })
        .catch(as404OrThrow),
    );
  }

  async setup(id: string, setupAssetDto: SetupAssetDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.asset
        .update({
          where: { id, setupOn: null },
          data: {
            ...setupAssetDto,
            setupOn: new Date(),
          },
        })
        .catch(as404OrThrow),
    );
  }

  async updateSetup(id: string, updateSetupAssetDto: UpdateSetupAssetDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.asset
        .update({
          where: { id, setupOn: { not: null } },
          data: updateSetupAssetDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.asset.delete({ where: { id } }));
  }
}
