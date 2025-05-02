import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class InspectionsPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagsService: TagsService,
  ) {}

  async isValidTagUrl(url: string) {
    return this.tagsService.validateTagUrl(url);
  }

  async isValidTagId({ id, extId }: { id?: string; extId?: string }) {
    if (!id && !extId) {
      throw new BadRequestException('Either id or extId must be provided');
    }

    return this.prisma
      .bypassRLS()
      .tag.findUnique({
        where: { id, externalId: extId },
        select: { id: true, externalId: true, serialNumber: true },
      })
      .then((tagData) => ({
        isValid: tagData !== null,
        tag: tagData,
      }))
      .then(async (result) => {
        if (!result.isValid || !result.tag) {
          return result;
        }

        const inspectionToken = await this.tagsService.generateInspectionToken(
          result.tag.serialNumber,
          result.tag.externalId,
        );
        return {
          isValid: true,
          tag: result.tag,
          inspectionToken,
        };
      });
  }

  async getInspectionHistory(token: string) {
    const { tagExternalId } = this.tagsService.parseInspectionToken(token);

    const assetPromise = this.prisma.bypassRLS().asset.findFirst({
      where: {
        tag: {
          externalId: tagExternalId,
        },
      },
      include: {
        product: {
          include: {
            productCategory: true,
          },
        },
      },
    });

    const unresolvedAlertsPromise = this.prisma.bypassRLS().alert.findMany({
      where: {
        asset: {
          tag: { externalId: tagExternalId },
        },
        resolved: false,
      },
    });

    const inspectionsPromise = this.prisma.bypassRLS().inspection.findMany({
      where: {
        asset: {
          tag: {
            externalId: tagExternalId,
          },
        },
      },
      include: {
        inspector: true,
        alerts: true,
      },
    });

    return Promise.all([
      assetPromise,
      unresolvedAlertsPromise,
      inspectionsPromise,
    ]).then(([asset, unresolvedAlerts, inspections]) => ({
      asset,
      unresolvedAlerts,
      inspections,
    }));
  }

  async validateInspectionToken(token: string) {
    return this.tagsService.validateInspectionToken(token);
  }
}
