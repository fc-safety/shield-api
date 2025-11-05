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
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { CreateAssetQuestionDto } from '../asset-questions/dto/create-asset-question.dto';
import { UpdateAssetQuestionDto } from '../asset-questions/dto/update-asset-question.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@CheckResourcePermissions('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query() queryProductDto?: QueryProductDto) {
    return this.productsService.findAll(queryProductDto);
  }

  @Get('online-store')
  shopifyFindAll() {
    return this.productsService.shopifyFindAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // Questions

  @CheckPolicies(({ user }) => user.canCreate('asset-questions'))
  @Post(':id/questions')
  addQuestion(
    @Param('id') id: string,
    @Body() createAssetQuestionDto: CreateAssetQuestionDto,
  ) {
    return this.productsService.addQuestion(id, createAssetQuestionDto);
  }

  @CheckPolicies(({ user }) => user.canUpdate('asset-questions'))
  @Patch(':id/questions/:questionId')
  updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() updateAssetQuestionDto: UpdateAssetQuestionDto,
  ) {
    return this.productsService.updateQuestion(
      id,
      questionId,
      updateAssetQuestionDto,
    );
  }

  @CheckPolicies(({ user }) => user.canDelete('asset-questions'))
  @Delete(':id/questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string) {
    return this.productsService.deleteQuestion(questionId);
  }
}
