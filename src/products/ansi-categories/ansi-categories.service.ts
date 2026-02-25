import { Injectable } from '@nestjs/common';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAnsiCategoryDto } from './dto/create-ansi-category.dto';
import { QueryAnsiCategoryDto } from './dto/query-ansi-category.dto';
import { UpdateAnsiCategoryDto } from './dto/update-ansi-category.dto';

@Injectable()
export class AnsiCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAnsiCategoryDto: CreateAnsiCategoryDto) {
    return this.prisma.build().then((prisma) =>
      prisma.ansiCategory.create({
        data: createAnsiCategoryDto,
      }),
    );
  }

  async findAll(queryAnsiCategoryDto?: QueryAnsiCategoryDto) {
    return this.prisma
      .build()
      .then((prisma) =>
        prisma.ansiCategory.findManyForPage(
          buildPrismaFindArgs<typeof prisma.ansiCategory>(queryAnsiCategoryDto),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma.build().then((prisma) =>
      prisma.ansiCategory.findUniqueOrThrow({
        where: { id },
      }),
    );
  }

  async update(id: string, updateAnsiCategoryDto: UpdateAnsiCategoryDto) {
    return this.prisma.build().then((prisma) =>
      prisma.ansiCategory.update({
        where: { id },
        data: updateAnsiCategoryDto,
      }),
    );
  }

  async remove(id: string) {
    return this.prisma.build().then((prisma) =>
      prisma.ansiCategory.delete({
        where: { id },
      }),
    );
  }
}
