import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssetQuestionDto } from '../asset-questions/dto/create-asset-question.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { QueryProductCategoryDto } from './dto/query-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    protected readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createProductCategoryDto: CreateProductCategoryDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.productCategory.create({
        data: createProductCategoryDto,
      }),
    );
  }

  async findAll(queryProductCategoryDto?: QueryProductCategoryDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) =>
        prisma.productCategory.findManyForPage(
          buildPrismaFindArgs<typeof prisma.productCategory>(
            queryProductCategoryDto,
          ),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.productCategory
        .findUniqueOrThrow({
          where: { id },
          include: {
            assetQuestions: true,
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateProductCategoryDto: UpdateProductCategoryDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.productCategory
        .update({
          where: { id },
          data: updateProductCategoryDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.productCategory.delete({ where: { id } }));
  }

  // QUESTIONS

  async addQuestion(id: string, input: CreateAssetQuestionDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.assetQuestion
        .create({
          data: { ...input, productCategoryId: id },
        })
        .catch(as404OrThrow),
    );
  }
}
