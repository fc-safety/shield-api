import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { normalizeState } from 'src/common/address-utils';
import { US_STATES } from 'src/common/geography/geography.constants';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import {
  AssetQuestionConditionType,
  AssetQuestionResponseType,
  AssetQuestionType,
  Prisma,
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetQuestionConditionDto } from './dto/create-asset-question-condition.dto';
import {
  CreateAssetQuestionDto,
  CreateAssetQuestionSchema,
  CreateSetAssetMetadataConfigSchema,
} from './dto/create-asset-question.dto';
import { CreateClientAssetQuestionCustomizationDto } from './dto/create-client-asset-question-customization.dto';
import { QueryAssetQuestionDto } from './dto/query-asset-question.dto';
import { QueryQuestionsByAssetPropertiesDto } from './dto/query-questions-by-asset-properties.dto';
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
    return this.prisma.forContext().then((prisma) =>
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
              setAssetMetadataConfig: true,
              files: true,
              regulatoryCodes: true,
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
                regulatoryCodes: true,
              },
            },
            conditions: true,
            assetAlertCriteria: true,
            setAssetMetadataConfig: true,
            files: true,
            regulatoryCodes: true,
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
    return this.prisma.forContext().then((prisma) =>
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
      .forContext()
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
    return this.prisma.forContext().then((prisma) =>
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
    return this.prisma.forContext().then((prisma) =>
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
    return this.prisma.forContext().then((prisma) =>
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
      .forContext()
      .then((prisma) =>
        prisma.assetQuestionCondition.delete({ where: { id: conditionId } }),
      )
      .catch(as404OrThrow);
  }

  // ASSET-SPECIFIC QUESTIONS

  async findByAssetId(assetId: string, type?: AssetQuestionType) {
    const prisma = await this.prisma.build();

    // Get the asset with all relevant data
    const asset = await prisma.asset
      .findUniqueOrThrow({
        where: { id: assetId },
        include: {
          product: true,
          site: {
            include: {
              address: true,
            },
          },
        },
      })
      .catch(as404OrThrow);

    return await this.findByAsset(asset, type);
  }

  async findByAssetProperties(query: QueryQuestionsByAssetPropertiesDto) {
    const prisma = await this.prisma.build();

    const partialAssetProperties: Partial<
      Prisma.AssetGetPayload<{
        include: { product: true; site: { include: { address: true } } };
      }>
    > = {};

    [partialAssetProperties.site, partialAssetProperties.product] =
      await Promise.all([
        prisma.site
          .findUnique({
            where: { id: query.siteId },
            include: { address: true },
          })
          .then((s) => s ?? undefined),
        prisma.product
          .findUnique({
            where: { id: query.productId },
          })
          .then((p) => p ?? undefined),
      ]);

    return await this.findByAsset(partialAssetProperties, query.type);
  }

  async findQuestionIdsByAsset(
    asset: Partial<
      Prisma.AssetGetPayload<{
        include: { product: true; site: { include: { address: true } } };
      }>
    >,
    type?: AssetQuestionType,
  ) {
    const prisma = await this.prisma.build();

    const isClientUserRequest = prisma.$viewContext === 'user';

    // TODO: This is beginning of support for variants.
    // const andFilters: Prisma.AssetQuestionConditionWhereInput[] = [
    //   {
    //     conditionType: AssetQuestionConditionType.PRODUCT_CATEGORY,
    //     value: {
    //       array_contains: [asset.product.productCategoryId],
    //     },
    //   },
    //   {
    //     conditionType: AssetQuestionConditionType.PRODUCT,
    //     value: {
    //       array_contains: [asset.productId],
    //     },
    //   },
    //   {
    //     conditionType: AssetQuestionConditionType.MANUFACTURER,
    //     value: {
    //       array_contains: [asset.product.manufacturerId],
    //     },
    //   },
    // ];

    // if (asset.site.address.state) {
    //   andFilters.push({
    //     conditionType: AssetQuestionConditionType.REGION,
    //     value: {
    //       array_contains: [normalizeState(asset.site.address.state)],
    //     },
    //   });
    // }

    // Begin building raw SQL query to get questions whose conditions match the asset.
    const sqlParts: Prisma.Sql[] = [
      Prisma.sql`
        SELECT DISTINCT aq.id FROM "AssetQuestion" aq
        LEFT JOIN "AssetQuestionCondition" condition ON condition."assetQuestionId" = aq."id"
        LEFT JOIN "Client" client ON client."id" = aq."clientId"
      `,
    ];

    // Add base WHERE clauses to the query. These must ALWAYS be true.
    const andWhereClauses: Prisma.Sql[] = [
      Prisma.sql`aq."active" = true`,
      Prisma.sql`aq."parentQuestionId" IS NULL`,
    ];

    // When request is coming from a client user (not a system/super admin), filter by client specific customizations.
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

    // Filter by question type (i.e. setup, inspection or both).
    if (type !== undefined && type !== AssetQuestionType.SETUP_AND_INSPECTION) {
      const types =
        type === AssetQuestionType.SETUP
          ? [AssetQuestionType.SETUP, AssetQuestionType.SETUP_AND_INSPECTION]
          : type === AssetQuestionType.INSPECTION
            ? [
                AssetQuestionType.INSPECTION,
                AssetQuestionType.SETUP_AND_INSPECTION,
              ]
            : [type];
      andWhereClauses.push(Prisma.sql`aq."type"::text = ANY(${types})`);
    }

    // Begin adding clauses for the conditions. We need to do some magic here to make sure that:
    // 1. Questions are returned ONLY when ALL conditions are met.
    //    a. This is achieved by grouping by question ID and using a HAVING clause to verify that the count of conditions met is equal to the total number of conditions.
    // 2. When conditions have multiple values, any matching asset value renders the condition met.
    //    a. This is achieved by using the @> operator to check if the asset value is a subset of the condition value.

    const orWhereClauses: Prisma.Sql[] = [];

    if (asset.product) {
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.PRODUCT_CATEGORY} AND condition."value" @> to_jsonb(${asset.product.productCategoryId}))`,
      );
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.MANUFACTURER} AND condition."value" @> to_jsonb(${asset.product.manufacturerId}))`,
      );
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.PRODUCT} AND condition."value" @> to_jsonb(${asset.product.id}))`,
      );
    }

    if (asset.site && asset.site.address.state) {
      orWhereClauses.push(
        Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.REGION} AND condition."value" @> to_jsonb(${normalizeState(asset.site.address.state)}))`,
      );
    }

    const assetMetadata = getValidatedMetadata(asset.metadata ?? null);
    const productMetadata = getValidatedMetadata(
      asset.product?.metadata ?? null,
    );

    if (assetMetadata || productMetadata) {
      const keyPairs = [
        ...Object.entries(assetMetadata ?? {}),
        ...Object.entries(productMetadata ?? {}),
      ].map(([k, v]) => `${k}:${v}`);
      const uniqueKeyPairs = [...new Set(keyPairs)];

      if (keyPairs.length > 0) {
        // orFilters.push({
        //   conditionType: AssetQuestionConditionType.METADATA,
        //   value: { array_contains: keyPairs },
        // });
        orWhereClauses.push(
          Prisma.sql`(condition."conditionType"::text = ${AssetQuestionConditionType.METADATA} AND array(SELECT jsonb_array_elements_text(condition."value")) && array(SELECT jsonb_array_elements_text(to_jsonb(${uniqueKeyPairs}))))`,
        );
      }
    }

    // Join OR clauses and add to AND clauses
    if (orWhereClauses.length > 0) {
      andWhereClauses.push(
        Prisma.sql`(${Prisma.join(orWhereClauses, ' OR ')})`,
      );
    } else {
      // Don't call database if we're not filtering by any conditions.
      return [];
    }

    sqlParts.push(Prisma.sql`WHERE (${Prisma.join(andWhereClauses, ' AND ')})`);

    sqlParts.push(Prisma.sql`GROUP BY aq."id"`);

    sqlParts.push(Prisma.sql`HAVING COUNT(*) = (
      SELECT COUNT(*) FROM "AssetQuestionCondition" WHERE "assetQuestionId" = aq."id"
    )`);

    const sql = Prisma.join(sqlParts, ' ');

    const matchingIds = await prisma.$queryRaw<{ id: string }[]>(sql);

    return matchingIds.map((m) => m.id);
  }
  async findByAsset(...args: Parameters<typeof this.findQuestionIdsByAsset>) {
    const prisma = await this.prisma.build();
    const questionIds = await this.findQuestionIdsByAsset(...args);

    const questions = await prisma.assetQuestion.findMany({
      where: {
        id: {
          in: questionIds,
        },
      },
      include: {
        files: true,
        regulatoryCodes: true,
        variants: {
          include: {
            conditions: true,
          },
        },
        client: true,
      },
      orderBy: [{ order: 'asc' }, { createdOn: 'asc' }],
    });

    return questions.map((q) => {
      const { variants, ...question } = q;

      // TODO: This is beginning of support for variants.
      // if (variants.length === 0) {
      //   return q;
      // }

      // const matchingVariant = variants
      //   .sort((a, b) => (a.order ?? 0) - (b.order ?? 1))
      //   .find((v) =>
      //     v.conditions.every((c) =>
      //       andFilters.every((f) =>
      //         f.conditionType === c.conditionType &&
      //         !isNil(c.value) &&
      //         Array.isArray(c.value)
      //           ? c.value.includes(f.value as string)
      //           : c.value === f.value,
      //       ),
      //     ),
      //   );

      // if (matchingVariant) {
      //   return matchingVariant;
      // }

      return question;
    });
  }

  async checkAssetConfiguration(assetId: string) {
    const prisma = await this.prisma.build();
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { product: true, site: { include: { address: true } } },
    });

    const questionIds = await this.findQuestionIdsByAsset(
      asset,
      AssetQuestionType.CONFIGURATION,
    );

    const questions = await prisma.assetQuestion.findMany({
      where: {
        id: { in: questionIds },
      },
      include: {
        conditions: true,
        setAssetMetadataConfig: true,
      },
    });

    const assetMetadata = getValidatedMetadata(asset.metadata ?? null) ?? {};

    const metadataAudit: {
      key: string;
      staticValue?: string;
      assetValue: string | null;
      isMet: boolean;
      assetQuestion: Prisma.AssetQuestionGetPayload<{}>;
    }[] = [];

    for (const question of questions) {
      if (!question.setAssetMetadataConfig) continue;
      const parseResult = CreateSetAssetMetadataConfigSchema.safeParse(
        question.setAssetMetadataConfig,
      );
      if (!parseResult.success) continue;
      const metadataConfigs = parseResult.data.metadata;

      for (const metadataConfig of metadataConfigs) {
        const assetMetadataValue =
          metadataConfig.key in assetMetadata
            ? assetMetadata[metadataConfig.key]
            : null;

        if (metadataConfig.type === 'STATIC') {
          if (metadataConfig.value) {
            metadataAudit.push({
              key: metadataConfig.key,
              staticValue: metadataConfig.value,
              assetValue: assetMetadataValue,
              isMet: metadataConfig.value === assetMetadataValue,
              assetQuestion: question,
            });
          }
        } else {
          const parsedSelectOptions =
            question.valueType === AssetQuestionResponseType.SELECT
              ? question.selectOptions
                ? (CreateAssetQuestionSchema.shape.selectOptions.safeParse(
                    question.selectOptions,
                  ).data ?? null)
                : null
              : null;

          metadataAudit.push({
            key: metadataConfig.key,
            assetValue: assetMetadataValue,
            isMet:
              !!assetMetadataValue &&
              (!parsedSelectOptions ||
                parsedSelectOptions.some(
                  (o) => o.value === assetMetadataValue,
                )),
            assetQuestion: question,
          });
        }
      }
    }

    return {
      checkResults: metadataAudit,
      isConfigurationMet: metadataAudit.every((m) => m.isMet),
    };
  }

  async migrateQuestionsToConditions() {
    return this.prisma.bypassRLS().$transaction(async (tx) => {
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

  async getStateOptions() {
    const prisma = await this.prisma.build();
    const addressStates = await prisma.$queryRaw<{ state: string }[]>`
      SELECT DISTINCT a.state
      FROM "Client" c
      LEFT JOIN "Site" s ON s."clientId" = c."id"
      LEFT JOIN "Address" a ON a."id" = s."addressId" OR a."id" = c."addressId"
      WHERE a.state IS NOT NULL;
    `.then((r) => r.map((r) => r.state));

    const statesMap = new Map(addressStates.map((s) => [s, s]));

    US_STATES.forEach((s) => {
      statesMap.set(s.code, s.name);
    });

    return Array.from(statesMap.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }
}

/**
 * Validates that the metadata is an object, otherwise returns null.
 *
 * @param metadata The raw JSONB value from the database.
 * @returns The validated metadata object or null if the metadata is not valid.
 */
const getValidatedMetadata = (metadata: Prisma.JsonValue): object | null => {
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    !Array.isArray(metadata)
  ) {
    return metadata;
  }
  return null;
};
