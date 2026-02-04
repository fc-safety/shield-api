import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckCapability } from 'src/auth/policies.guard';
import { AnsiCategoriesService } from './ansi-categories.service';
import { CreateAnsiCategoryDto } from './dto/create-ansi-category.dto';
import { QueryAnsiCategoryDto } from './dto/query-ansi-category.dto';
import { UpdateAnsiCategoryDto } from './dto/update-ansi-category.dto';

@Controller('ansi-categories')
@CheckCapability('configure-products')
export class AnsiCategoriesController {
  constructor(private readonly ansiCategoriesService: AnsiCategoriesService) {}

  @Post()
  create(@Body() createAnsiCategoryDto: CreateAnsiCategoryDto) {
    return this.ansiCategoriesService.create(createAnsiCategoryDto);
  }

  @Get()
  findAll(@Query() queryAnsiCategoryDto?: QueryAnsiCategoryDto) {
    return this.ansiCategoriesService.findAll(queryAnsiCategoryDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ansiCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnsiCategoryDto: UpdateAnsiCategoryDto,
  ) {
    return this.ansiCategoriesService.update(id, updateAnsiCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ansiCategoriesService.remove(id);
  }
}
