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
import { CheckCapability, CheckIsAuthenticated } from 'src/auth/policies.guard';
import { CreateAssetQuestionDto } from '../asset-questions/dto/create-asset-question.dto';
import { UpdateAssetQuestionDto } from '../asset-questions/dto/update-asset-question.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { QueryProductCategoryDto } from './dto/query-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
@CheckCapability('configure-products')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  create(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(createProductCategoryDto);
  }

  @Get()
  @CheckIsAuthenticated()
  findAll(@Query() queryProductCategoryDto?: QueryProductCategoryDto) {
    return this.productCategoriesService.findAll(queryProductCategoryDto);
  }

  @Get(':id')
  @CheckIsAuthenticated()
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

  @Patch(':id/questions/:questionId')
  updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() updateAssetQuestionDto: UpdateAssetQuestionDto,
  ) {
    return this.productCategoriesService.updateQuestion(
      id,
      questionId,
      updateAssetQuestionDto,
    );
  }

  @Delete(':id/questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string) {
    return this.productCategoriesService.deleteQuestion(questionId);
  }
}
