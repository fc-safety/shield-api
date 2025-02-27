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
import { ViewCtx } from 'src/common/decorators';
import { ViewContext } from 'src/common/utils';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { QueryProductRequestDto } from './dto/query-product-request.dto';
import { ReviewProductRequestDto } from './dto/review-product-request.dto';
import { UpdateProductRequestStatusDto } from './dto/update-product-request-status.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';
import { ProductRequestsService } from './product-requests.service';

@Controller('product-requests')
@CheckResourcePermissions('product-requests')
export class ProductRequestsController {
  constructor(
    private readonly productRequestsService: ProductRequestsService,
  ) {}

  @Post()
  create(@Body() data: CreateProductRequestDto) {
    return this.productRequestsService.create(data);
  }

  @Get()
  findAll(
    @Query() query: QueryProductRequestDto,
    @ViewCtx() context: ViewContext,
  ) {
    return this.productRequestsService.findAll(query, context);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productRequestsService.findOne(id);
  }

  @Patch('statuses')
  @CheckPolicies((context) =>
    context.user.can('update-status', 'product-requests'),
  )
  updateStatuses(@Body() data: UpdateProductRequestStatusDto) {
    return this.productRequestsService.updateStatuses(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateProductRequestDto) {
    return this.productRequestsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productRequestsService.remove(id);
  }

  @Delete(':id/cancel')
  @CheckPolicies((context) => context.user.can('cancel', 'product-requests'))
  cancel(@Param('id') id: string) {
    return this.productRequestsService.cancel(id);
  }

  @Patch(':id/review')
  @CheckPolicies((context) => context.user.can('review', 'product-requests'))
  review(@Param('id') id: string, @Body() data: ReviewProductRequestDto) {
    return this.productRequestsService.review(id, data);
  }
}
