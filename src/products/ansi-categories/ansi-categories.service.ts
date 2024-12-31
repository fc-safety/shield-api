import { Injectable } from '@nestjs/common';
import { CreateAnsiCategoryDto } from './dto/create-ansi-category.dto';
import { UpdateAnsiCategoryDto } from './dto/update-ansi-category.dto';

@Injectable()
export class AnsiCategoriesService {
  create(createAnsiCategoryDto: CreateAnsiCategoryDto) {
    return 'This action adds a new ansiCategory';
  }

  findAll() {
    return `This action returns all ansiCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ansiCategory`;
  }

  update(id: number, updateAnsiCategoryDto: UpdateAnsiCategoryDto) {
    return `This action updates a #${id} ansiCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} ansiCategory`;
  }
}
