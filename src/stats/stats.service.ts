import { Injectable } from '@nestjs/common';
import {
  differenceInDays,
  endOfMonth,
  isAfter,
  isBefore,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryComplianceHistoryDto } from './dto/query-compliance-history.dto';

type AssetRow = Prisma.AssetGetPayload<{
  include: {
    inspections: {
      select: {
        id: true;
        createdOn: true;
      };
    };
    site: {
      select: {
        id: true;
        name: true;
      };
    };
    product: {
      include: {
        productCategory: {
          select: {
            id: true;
            name: true;
            shortName: true;
          };
        };
      };
    };
  };
}>;

export interface ComplianceStatsRecord {
  endDate: Date;
  assetsByComplianceStatus: {
    COMPLIANT_DUE_LATER: AssetRow[];
    COMPLIANT_DUE_SOON: AssetRow[];
    NON_COMPLIANT_INSPECTED: AssetRow[];
    NON_COMPLIANT_NEVER_INSPECTED: AssetRow[];
  };
  totalAssets: number;
  totalCompliant: number;
  totalNonCompliant: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getComplianceHistoryByMonth(
    queryComplianceHistoryDto: QueryComplianceHistoryDto,
  ) {
    const { months, siteId } = queryComplianceHistoryDto;
    const xMonthsAgo =
      months === 1 ? new Date() : startOfMonth(subMonths(new Date(), months));

    return this.prisma.build().then(async (prisma) => {
      const getAssetInspections = async (options: {
        latestOnlyBeforeCutoff?: boolean;
      }) =>
        prisma.asset.findMany({
          where: {
            active: true,
            siteId,
            site: {
              active: true,
            },
          },
          include: {
            inspections: {
              orderBy: { createdOn: 'desc' },
              take: options.latestOnlyBeforeCutoff ? 1 : undefined,
              where: {
                createdOn: options.latestOnlyBeforeCutoff
                  ? {
                      lte: xMonthsAgo,
                    }
                  : {
                      gte: xMonthsAgo,
                    },
              },
              select: {
                id: true,
                createdOn: true,
              },
            },
            site: {
              select: {
                id: true,
                name: true,
              },
            },
            product: {
              include: {
                productCategory: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                  },
                },
              },
            },
          },
        });

      const [
        clientDefaultInspectionCycle,
        assetsLatestInspections,
        assetsInspectionsByDate,
      ] = await Promise.all([
        prisma.client
          .findFirst({
            select: {
              defaultInspectionCycle: true,
            },
          })
          .then((client) => client?.defaultInspectionCycle ?? 30),
        // If we're only retreiving 1 month (aka today), we only need the latest inspection.
        getAssetInspections({
          latestOnlyBeforeCutoff: true,
        }),
        // If we're retreiving more than 1 month, we want to also get all inspections
        // after the cutoff date (which is in the past) to build the compliance history.
        months > 1
          ? getAssetInspections({
              latestOnlyBeforeCutoff: false,
            })
          : (Promise.resolve([]) as ReturnType<typeof getAssetInspections>),
      ]);

      // Merge
      const assetInspectionsByDateMap = new Map<
        string,
        (typeof assetsInspectionsByDate)[number]
      >(assetsInspectionsByDate.map((a) => [a.id, a]));
      const mergedAssetInspections = assetsLatestInspections.map(
        ({ inspections, ...a }) => {
          const latestBeforeCutoff = inspections.at(0);
          const inspectionsAfterCutoff =
            assetInspectionsByDateMap
              .get(a.id)
              ?.inspections.filter(
                (i) => !latestBeforeCutoff || i.id !== latestBeforeCutoff.id,
              ) ?? [];

          return {
            ...a,
            inspections: [
              ...inspectionsAfterCutoff,
              ...(latestBeforeCutoff ? [latestBeforeCutoff] : []),
            ],
          };
        },
      );

      const complianceHistory: ComplianceStatsRecord[] = [];
      let currentHistoricDate = new Date();
      let monthsProcessed = 0;

      while (monthsProcessed < months) {
        const complianceStats: ComplianceStatsRecord = {
          endDate: currentHistoricDate,
          assetsByComplianceStatus: {
            COMPLIANT_DUE_LATER: [],
            COMPLIANT_DUE_SOON: [],
            NON_COMPLIANT_INSPECTED: [],
            NON_COMPLIANT_NEVER_INSPECTED: [],
          },
          totalAssets: 0,
          totalCompliant: 0,
          totalNonCompliant: 0,
        };
        for (const asset of mergedAssetInspections) {
          // Skip assets created after the current historic date.
          if (isAfter(asset.createdOn, currentHistoricDate)) {
            continue;
          }

          complianceStats.totalAssets++;

          const latestInspection = asset.inspections
            .filter((i) => isBefore(i.createdOn, currentHistoricDate))
            .at(0);

          if (!latestInspection) {
            complianceStats.assetsByComplianceStatus.NON_COMPLIANT_NEVER_INSPECTED.push(
              asset,
            );
            complianceStats.totalNonCompliant++;
            continue;
          }

          const daysSinceInspection = differenceInDays(
            currentHistoricDate,
            latestInspection.createdOn,
          );

          const inspectionCycle =
            asset.inspectionCycle ?? clientDefaultInspectionCycle;
          const dueSoonThreshold = Math.max(
            inspectionCycle - 7,
            Math.floor(inspectionCycle / 2),
          );

          if (daysSinceInspection < dueSoonThreshold) {
            complianceStats.assetsByComplianceStatus.COMPLIANT_DUE_LATER.push(
              asset,
            );
            complianceStats.totalCompliant++;
          } else if (daysSinceInspection < inspectionCycle) {
            complianceStats.assetsByComplianceStatus.COMPLIANT_DUE_SOON.push(
              asset,
            );
            complianceStats.totalCompliant++;
          } else {
            complianceStats.assetsByComplianceStatus.NON_COMPLIANT_INSPECTED.push(
              asset,
            );
            complianceStats.totalNonCompliant++;
          }
        }

        complianceHistory.push(complianceStats);
        currentHistoricDate = endOfMonth(subMonths(currentHistoricDate, 1));
        monthsProcessed++;
      }

      return complianceHistory;
    });
  }
}
