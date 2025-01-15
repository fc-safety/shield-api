import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { testAlertRule } from 'src/common/alert-utils';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetAlertCriterionRuleSchema } from 'src/products/asset-questions/dto/create-asset-question.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createInspectionDto: CreateInspectionDto) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.inspection.create({ data: createInspectionDto }))
      .then(async (inspection) => {
        await this.handleAlertTriggers(inspection.id);
        return inspection;
      });
  }

  private async handleAlertTriggers(inspectionId: string) {
    const inspection = await this.prisma.forUser().then((prisma) =>
      prisma.inspection.findUnique({
        where: { id: inspectionId },
        include: {
          responses: {
            include: {
              assetQuestion: {
                include: {
                  assetAlertCriteria: true,
                },
              },
            },
          },
        },
      }),
    );

    if (!inspection || inspection.status !== 'COMPLETE') {
      return;
    }

    const createInputs = inspection.responses.flatMap((response) =>
      response.assetQuestion.assetAlertCriteria
        .map((alertCriteria) => {
          const {
            success,
            data: rule,
            error,
          } = CreateAssetAlertCriterionRuleSchema.safeParse(alertCriteria.rule);

          if (!success || !rule || error) {
            this.logger.warn('Invalid alert rule', error);
            return {
              alertCriteria,
              result: false,
            };
          }

          return {
            alertCriteria,
            result: testAlertRule(
              response.value,
              response.assetQuestion.valueType,
              rule,
            ),
          };
        })
        .filter(
          (r): r is typeof r & { result: string } =>
            typeof r.result === 'string',
        )
        .map(
          ({ alertCriteria: alertCriterion, result: message }) =>
            ({
              alertLevel: alertCriterion.alertLevel,
              message,
              assetId: inspection.assetId,
              inspectionId: inspection.id,
              assetQuestionResponseId: response.id,
              assetAlertCriterionId: alertCriterion.id,
              siteId: inspection.siteId,
              clientId: inspection.clientId,
            }) satisfies Prisma.AlertCreateManyInput,
        ),
    );

    await this.prisma.bypassRLS().alert.createMany({
      data: createInputs,
    });
  }

  async findAll(queryInspectionDto?: QueryInspectionDto) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.inspection.findManyForPage(
          buildPrismaFindArgs<typeof prisma.inspection>(queryInspectionDto),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.inspection.findUniqueOrThrow({
          where: { id },
          include: {
            inspector: true,
            responses: {
              include: {
                assetQuestion: true,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateInspectionDto: UpdateInspectionDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspection
        .update({
          where: { id },
          data: updateInspectionDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.inspection.delete({ where: { id } }));
  }
}
