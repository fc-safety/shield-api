import { Injectable } from '@nestjs/common';
import type {
  AssetQuestion,
  AssetQuestionResponse,
  ConsumableQuestionConfig,
  Prisma,
  Product,
} from '@prisma/client';
import { ConsumableMappingType } from '@prisma/client';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { QueryConsumableDto } from './dto/query-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
@Injectable()
export class ConsumablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableDto: CreateConsumableDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.consumable.create({
        data: createConsumableDto,
      }),
    );
  }

  async findAll(queryConsumableDto?: QueryConsumableDto) {
    return this.prisma.forUser().then(async (prisma) =>
      prisma.consumable.findManyForPage(
        buildPrismaFindArgs<typeof prisma.consumable>(queryConsumableDto, {
          include: {
            asset: true,
            product: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.consumable.findUniqueOrThrow({
          where: { id },
          include: {
            asset: true,
            product: true,
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateConsumableDto: UpdateConsumableDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.consumable
        .update({
          where: { id },
          data: updateConsumableDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.consumable
        .delete({
          where: { id },
        })
        .catch(as404OrThrow),
    );
  }

  async handleConsumableConfig(
    tx: Awaited<ReturnType<PrismaService['forUser']>>,
    response: AssetQuestionResponse & {
      assetQuestion: AssetQuestion & {
        consumableConfig?: ConsumableQuestionConfig & {
          consumableProduct: Product;
        };
      };
    },
    assetId: string,
  ) {
    const { consumableConfig } = response.assetQuestion;
    if (!consumableConfig) return;

    const existingConsumable = await tx.consumable.findFirst({
      where: {
        assetId,
        productId: consumableConfig.consumableProduct.id,
      },
    });

    const consumableData = this.mapResponseToConsumable(
      response.value,
      consumableConfig.mappingType,
    );

    if (existingConsumable) {
      await tx.consumable.update({
        where: { id: existingConsumable.id },
        data: consumableData,
      });
    } else {
      await tx.consumable.create({
        data: {
          ...consumableData,
          asset: { connect: { id: assetId } },
          product: { connect: { id: consumableConfig.consumableProduct.id } },
        },
      });
    }
  }

  private mapResponseToConsumable(
    value: any,
    mappingType: ConsumableMappingType,
  ) {
    switch (mappingType) {
      case ConsumableMappingType.EXPIRATION_DATE:
        return {
          expiresOn: new Date(value),
        } satisfies Omit<Prisma.ConsumableCreateInput, 'asset' | 'product'>;
      default:
        throw new Error(`Unsupported mapping type: ${mappingType}`);
    }
  }
}
