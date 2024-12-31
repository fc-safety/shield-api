import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AnsiCategoriesService } from './ansi-categories.service';
import { CreateAnsiCategoryDto } from './dto/create-ansi-category.dto';
import { UpdateAnsiCategoryDto } from './dto/update-ansi-category.dto';

@Controller('ansi-categories')
export class AnsiCategoriesController {
  constructor(private readonly ansiCategoriesService: AnsiCategoriesService) {}

  @Post()
  create(@Body() createAnsiCategoryDto: CreateAnsiCategoryDto) {
    return this.ansiCategoriesService.create(createAnsiCategoryDto);
  }

  @Get()
  findAll() {
    return this.ansiCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ansiCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnsiCategoryDto: UpdateAnsiCategoryDto,
  ) {
    return this.ansiCategoriesService.update(+id, updateAnsiCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ansiCategoriesService.remove(+id);
  }
}
