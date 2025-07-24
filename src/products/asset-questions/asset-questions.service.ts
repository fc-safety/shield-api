import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { normalizeState } from 'src/common/address-utils';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetQuestionConditionDto } from './dto/create-asset-question-condition.dto';
import { CreateAssetQuestionDto } from './dto/create-asset-question.dto';
import { QueryAssetQuestionDto } from './dto/query-asset-question.dto';
import { UpdateAssetQuestionConditionDto } from './dto/update-asset-question-condition.dto';
import { UpdateAssetQuestionDto } from './dto/update-asset-question.dto';

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
              _count: {
                select: {
                  assetAlertCriteria: true,
                  conditions: true,
                  variants: true,
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

  async findByAsset(assetId: string) {
    const prisma = await this.prisma.forAdminOrUser();

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
        conditionType: 'PRODUCT_CATEGORY',
        value: {
          array_contains: [asset.product.productCategoryId],
        },
      },
      {
        conditionType: 'PRODUCT',
        value: {
          array_contains: [asset.productId],
        },
      },
      {
        conditionType: 'MANUFACTURER',
        value: {
          array_contains: [asset.product.manufacturerId],
        },
      },
    ];

    if (asset.product.productSubcategoryId) {
      orFilters.push({
        conditionType: 'PRODUCT_SUBCATEGORY',
        value: {
          array_contains: [asset.product.productSubcategoryId],
        },
      });
    }

    if (asset.site.address.state) {
      orFilters.push({
        conditionType: 'REGION',
        value: {
          array_contains: [normalizeState(asset.site.address.state)],
        },
      });
    }

    const questions = await prisma.assetQuestion.findMany({
      where: {
        active: true,
        conditions: {
          every: {
            OR: orFilters,
          },
        },
      },
      include: {
        parentQuestion: true,
      },
      orderBy: { order: 'asc', createdOn: 'asc' },
    });

    return questions;
  }
}
