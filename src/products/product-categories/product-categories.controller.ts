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
import { CreateAssetQuestionDto } from '../asset-questions/dto/create-asset-question.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { QueryProductCategoryDto } from './dto/query-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  create(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(createProductCategoryDto);
  }

  @Get()
  findAll(@Query() queryProductCategoryDto?: QueryProductCategoryDto) {
    return this.productCategoriesService.findAll(queryProductCategoryDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productCategoriesService.update(id, updateProductCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productCategoriesService.remove(id);
  }

  // Questions

  @Post(':id/questions')
  addQuestion(
    @Param('id') id: string,
    @Body() createAssetQuestionDto: CreateAssetQuestionDto,
  ) {
    return this.productCategoriesService.addQuestion(
      id,
      createAssetQuestionDto,
    );
  }
}
