import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetQuestionDto } from '../asset-questions/dto/create-asset-question.dto';
import { UpdateAssetQuestionDto } from '../asset-questions/dto/update-asset-question.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    protected readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.product.create({ data: createProductDto }));
  }

  async findAll(queryProductDto?: QueryProductDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.product.findManyForPage(
        buildPrismaFindArgs<typeof prisma.product>(queryProductDto, {
          include: {
            manufacturer: {
              include: {
                client: true,
              },
            },
            productCategory: {
              include: {
                client: true,
              },
            },
            ansiCategory: true,
            client: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.product
        .findUniqueOrThrow({
          where: { id },
          include: {
            assetQuestions: {
              include: {
                assetAlertCriteria: true,
                consumableConfig: true,
              },
            },
            productCategory: {
              include: {
                assetQuestions: true,
                client: true,
                products: {
                  where: {
                    type: 'CONSUMABLE',
                    parentProductId: null,
                  },
                  include: {
                    ansiCategory: true,
                  },
                },
              },
            },
            manufacturer: {
              include: {
                client: true,
              },
            },
            client: true,
            consumableProducts: {
              include: {
                ansiCategory: true,
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.product
        .update({
          where: { id },
          data: updateProductDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.product.delete({ where: { id } }));
  }

  // QUESTIONS

  async addQuestion(id: string, input: CreateAssetQuestionDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion
        .create({
          data: { ...input, product: { connect: { id } } },
        })
        .catch(as404OrThrow),
    );
  }

  async updateQuestion(
    id: string,
    questionId: string,
    input: UpdateAssetQuestionDto,
  ) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion
        .update({
          where: { id: questionId },
          data: { ...input, product: { connect: { id } } },
        })
        .catch(as404OrThrow),
    );
  }

  async deleteQuestion(questionId: string) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion
        .delete({
          where: { id: questionId },
        })
        .catch(as404OrThrow),
    );
  }
}
