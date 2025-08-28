import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { normalizeState } from 'src/common/address-utils';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow, isNil } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import {
  AssetQuestionConditionType,
  AssetQuestionType,
  Prisma,
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetQuestionConditionDto } from './dto/create-asset-question-condition.dto';
import { CreateAssetQuestionDto } from './dto/create-asset-question.dto';
import { CreateClientAssetQuestionCustomizationDto } from './dto/create-client-asset-question-customization.dto';
import { QueryAssetQuestionDto } from './dto/query-asset-question.dto';
import { UpdateAssetQuestionConditionDto } from './dto/update-asset-question-condition.dto';
import { UpdateAssetQuestionDto } from './dto/update-asset-question.dto';
import { UpdateClientAssetQuestionCustomizationDto } from './dto/update-client-asset-question-customization.dto';

@Injectable()
export class AssetQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    protected readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createAssetQuestionDto: CreateAssetQuestionDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion.create({
        data: createAssetQuestionDto,
        include: {
          productCategory: true,
          product: true,
          parentQuestion: true,
          variants: true,
          conditions: true,
          assetAlertCriteria: true,
          consumableConfig: true,
        },
      }),
    );
  }

  async findAll(queryAssetQuestionDto?: QueryAssetQuestionDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.assetQuestion.findManyForPage(
        buildPrismaFindArgs<typeof prisma.assetQuestion>(
          queryAssetQuestionDto,
          {
            where: {
              parentQuestionId: null,
            },
            include: {
              productCategory: true,
              product: true,
              conditions: true,
              assetAlertCriteria: true,
              consumableConfig: true,
              clientAssetQuestionCustomizations: prisma.$viewContext === 'user',
              files: true,
              _count: {
                select: {
                  assetAlertCriteria: true,
                  conditions: true,
                  variants: true,
                  files: true,
                },
              },
            },
          },
        ),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.forContext().then((prisma) =>
      prisma.assetQuestion
        .findUniqueOrThrow({
          where: { id, parentQuestionId: null },
          include: {
            variants: {
              include: {
                conditions: true,
                assetAlertCriteria: true,
              },
            },
            conditions: true,
            assetAlertCriteria: true,
            consumableConfig: {
              include: {
                consumableProduct: true,
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateAssetQuestionDto: UpdateAssetQuestionDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion
        .update({
          where: { id },
          data: updateAssetQuestionDto,
          include: {
            productCategory: true,
            product: true,
            parentQuestion: true,
            variants: true,
            conditions: true,
            assetAlertCriteria: true,
            consumableConfig: true,
          },
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.assetQuestion.delete({ where: { id } }))
      .catch(as404OrThrow);
  }

  // CLIENT CUSTOMIZATIONS

  async findClientCustomizations() {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.clientAssetQuestionCustomization.findMany());
  }

  async addClientCustomization(
    createClientAssetQuestionCustomizationDto: CreateClientAssetQuestionCustomizationDto,
  ) {
    return this.prisma.forUser().then((prisma) =>
      prisma.clientAssetQuestionCustomization.create({
        data: createClientAssetQuestionCustomizationDto,
      }),
    );
  }

  async updateClientCustomization(
    id: string,
    updateClientAssetQuestionCustomizationDto: UpdateClientAssetQuestionCustomizationDto,
  ) {
    return this.prisma.forUser().then((prisma) =>
      prisma.clientAssetQuestionCustomization.update({
        where: { id },
        data: updateClientAssetQuestionCustomizationDto,
      }),
    );
  }

  async removeClientCustomization(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.clientAssetQuestionCustomization.delete({ where: { id } }),
      );
  }

  // VARIANTS

  async addVariant(
    parentId: string,
    createAssetQuestionDto: CreateAssetQuestionDto,
  ) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion.create({
        data: {
          ...createAssetQuestionDto,
          parentQuestion: { connect: { id: parentId } },
        },
        include: {
          productCategory: true,
          product: true,
          parentQuestion: true,
          conditions: true,
          assetAlertCriteria: true,
        },
      }),
    );
  }

  // CONDITIONS

  async addCondition(
    questionId: string,
    createAssetQuestionConditionDto: CreateAssetQuestionConditionDto,
  ) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestionCondition
        .create({
          data: {
            ...createAssetQuestionConditionDto,
            assetQuestion: { connect: { id: questionId } },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async updateCondition(
    conditionId: string,
    updateAssetQuestionConditionDto: UpdateAssetQuestionConditionDto,
  ) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestionCondition
        .update({
          where: { id: conditionId },
          data: updateAssetQuestionConditionDto,
        })
        .catch(as404OrThrow),
    );
  }

  async removeCondition(conditionId: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) =>
        prisma.assetQuestionCondition.delete({ where: { id: conditionId } }),
      )
      .catch(as404OrThrow);
  }

  // ASSET-SPECIFIC QUESTIONS

  async findByAsset(assetId: string, type?: AssetQuestionType) {
    const prisma = await this.prisma.forContext();
    const isClientUserRequest = prisma.$viewContext === 'user';

    // Get the asset with all relevant data
    const asset = await prisma.asset
      .findUniqueOrThrow({
        where: { id: assetId },
        include: {
          product: {
            include: {
              manufacturer: true,
              productCategory: true,
              productSubcategory: true,
            },
          },
          site: {
            include: {
              address: true,
            },
          },
        },
      })
      .catch(as404OrThrow);

    const orFilters: Prisma.AssetQuestionConditionWhereInput[] = [
      {
        conditionType: AssetQuestionConditionType.PRODUCT_CATEGORY,
        value: {
          array_contains: [asset.product.productCategoryId],
        },
      },
      {
        conditionType: AssetQuestionConditionType.PRODUCT,
        value: {
          array_contains: [asset.productId],
        },
      },
      {
        conditionType: AssetQuestionConditionType.MANUFACTURER,
        value: {
          array_contains: [asset.product.manufacturerId],
        },
      },
    ];

    if (asset.product.productSubcategoryId) {
      orFilters.push({
        conditionType: AssetQuestionConditionType.PRODUCT_SUBCATEGORY,
        value: {
          array_contains: [asset.product.productSubcategoryId],
        },
      });
    }

    if (asset.site.address.state) {
      orFilters.push({
        conditionType: AssetQuestionConditionType.REGION,
        value: {
          array_contains: [normalizeState(asset.site.address.state)],
        },
      });
    }

    const sqlParts: Prisma.Sql[] = [
      Prisma.sql`
        SELECT DISTINCT aq.id FROM "AssetQuestion" aq
        LEFT JOIN "AssetQuestionCondition" condition ON condition."assetQuestionId" = aq."id"
        LEFT JOIN "Client" client ON client."id" = aq."clientId"
      `,
    ];

    const andWhereClauses: Prisma.Sql[] = [
      Prisma.sql`aq."active" = true`,
      Prisma.sql`aq."parentQuestionId" IS NULL`,
    ];

    if (isClientUserRequest) {
      sqlParts.push(
        Prisma.sql`
              LEFT JOIN "ClientAssetQuestionCustomization" aqcustom ON aqcustom."assetQuestionId" = aq."id"
            `,
      );
      andWhereClauses.push(
        Prisma.sql`(aqcustom.id IS NULL OR aqcustom."enabled" = true)`,
      );
    }

    const orWhereClauses: Prisma.Sql[] = [];

    if (type !== undefined && type !== AssetQuestionType.SETUP_AND_INSPECTION) {
      const types =
        type === AssetQuestionType.SETUP
          ? [AssetQuestionType.SETUP, AssetQuestionType.SETUP_AND_INSPECTION]
          : [
              AssetQuestionType.INSPECTION,
              AssetQuestionType.SETUP_AND_INSPECTION,
            ];
      andWhereClauses.push(Prisma.sql`aq."type"::text = ANY(${types})`);
    }

    orWhereClauses.push(
      Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.PRODUCT_CATEGORY} AND condition."value" @> to_jsonb(${asset.product.productCategoryId}))`,
    );
    orWhereClauses.push(
      Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.PRODUCT} AND condition."value" @> to_jsonb(${asset.productId}))`,
    );
    orWhereClauses.push(
      Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.MANUFACTURER} AND condition."value" @> to_jsonb(${asset.product.manufacturerId}))`,
    );

    if (asset.product.productSubcategoryId) {
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.PRODUCT_SUBCATEGORY} AND condition."value" @> to_jsonb(${asset.product.productSubcategoryId}))`,
      );
    }

    if (asset.site.address.state) {
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.REGION} AND condition."value" @> to_jsonb(${normalizeState(asset.site.address.state)}))`,
      );
    }

    if (asset.metadata) {
      const keyPairs = Object.entries(asset.metadata).map(
        ([k, v]) => `${k}:${v}`,
      );
      if (keyPairs.length > 0) {
        // orFilters.push({
        //   conditionType: AssetQuestionConditionType.METADATA,
        //   value: { array_contains: keyPairs },
        // });
        orWhereClauses.push(
          Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.METADATA} AND condition."value" <@ to_jsonb(${keyPairs}))`,
        );
      }
    }

    // Join OR clauses and add to AND clauses
    if (orWhereClauses.length > 0) {
      andWhereClauses.push(
        Prisma.sql`(${Prisma.join(orWhereClauses, ' OR ')})`,
      );
    }

    sqlParts.push(Prisma.sql`WHERE (${Prisma.join(andWhereClauses, ' AND ')})`);

    const sql = Prisma.join(sqlParts, ' ');

    const matchingIds = await prisma.$queryRaw<{ id: string }[]>(sql);

    const questions = await prisma.assetQuestion.findMany({
      where: {
        id: {
          in: matchingIds.map((m) => m.id),
        },
      },
      include: {
        files: true,
        variants: {
          include: {
            conditions: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdOn: 'asc' }],
    });

    return questions.map((q) => {
      const { variants, ...question } = q;

      if (variants.length === 0) {
        return q;
      }

      const matchingVariant = variants
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 1))
        .find((v) =>
          v.conditions.every((c) =>
            orFilters.some((f) =>
              f.conditionType === c.conditionType &&
              !isNil(c.value) &&
              Array.isArray(c.value)
                ? c.value.includes(f.value as string)
                : c.value === f.value,
            ),
          ),
        );

      if (matchingVariant) {
        return matchingVariant;
      }

      return question;
    });
  }

  async migrateQuestionsToConditions() {
    return this.prisma.txBypassRLS(async (tx) => {
      // Get all AssetQuestions with productCategoryId
      const questionsWithCategory = await tx.assetQuestion.findMany({
        where: {
          productCategoryId: { not: null },
        },
        include: {
          productCategory: true,
        },
      });

      let categoryMigrationCount = 0;

      // Migrate productCategoryId to conditions
      for (const question of questionsWithCategory) {
        if (!question.productCategoryId || !question.productCategory) continue;

        // Check if condition already exists
        const existingCondition = await tx.assetQuestionCondition.findFirst({
          where: {
            assetQuestionId: question.id,
            conditionType: 'PRODUCT_CATEGORY',
            value: {
              array_contains: [question.productCategoryId],
            },
          },
        });

        if (!existingCondition) {
          await tx.assetQuestionCondition.create({
            data: {
              assetQuestionId: question.id,
              conditionType: 'PRODUCT_CATEGORY',
              value: [question.productCategoryId],
              description: 'Migrated from productCategoryId field',
              clientId: question.productCategory.clientId,
            },
          });
          categoryMigrationCount++;
        }
      }

      // Get all AssetQuestions with productId
      const questionsWithProduct = await tx.assetQuestion.findMany({
        where: {
          productId: { not: null },
        },
        include: {
          product: true,
        },
      });

      let productMigrationCount = 0;

      // Migrate productId to conditions
      for (const question of questionsWithProduct) {
        if (!question.productId || !question.product) continue;

        // Check if condition already exists
        const existingCondition = await tx.assetQuestionCondition.findFirst({
          where: {
            assetQuestionId: question.id,
            conditionType: 'PRODUCT',
            value: {
              array_contains: [question.productId],
            },
          },
        });

        if (!existingCondition) {
          await tx.assetQuestionCondition.create({
            data: {
              assetQuestionId: question.id,
              conditionType: 'PRODUCT',
              value: [question.productId],
              description: 'Migrated from productId field',
              clientId: question.product.clientId,
            },
          });
          productMigrationCount++;
        }
      }

      // Clear productCategoryId and productId fields
      const categoryUpdateResult = await tx.assetQuestion.updateMany({
        where: {
          productCategoryId: { not: null },
          conditions: {
            some: {
              conditionType: 'PRODUCT_CATEGORY',
            },
          },
        },
        data: {
          productCategoryId: null,
        },
      });

      const productUpdateResult = await tx.assetQuestion.updateMany({
        where: {
          productId: { not: null },
          conditions: {
            some: {
              conditionType: 'PRODUCT',
            },
          },
        },
        data: {
          productId: null,
        },
      });

      return {
        categoryConditionsCreated: categoryMigrationCount,
        productConditionsCreated: productMigrationCount,
        categoryFieldsCleared: categoryUpdateResult.count,
        productFieldsCleared: productUpdateResult.count,
      };
    });
  }
}
