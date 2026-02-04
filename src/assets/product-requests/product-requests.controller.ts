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
import { CheckAnyCapability, CheckCapability } from 'src/auth/policies.guard';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { QueryProductRequestDto } from './dto/query-product-request.dto';
import { ReviewProductRequestDto } from './dto/review-product-request.dto';
import { UpdateProductRequestStatusDto } from './dto/update-product-request-status.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';
import { ProductRequestsService } from './product-requests.service';

@Controller('product-requests')
@CheckAnyCapability('submit-requests', 'approve-requests')
export class ProductRequestsController {
  constructor(
    private readonly productRequestsService: ProductRequestsService,
  ) {}

  @Post()
  @CheckCapability('submit-requests')
  create(@Body() data: CreateProductRequestDto) {
    return this.productRequestsService.create(data);
  }

  @Get()
  findAll(@Query() query: QueryProductRequestDto) {
    return this.productRequestsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productRequestsService.findOne(id);
  }

  @Patch('statuses')
  @CheckCapability('approve-requests')
  updateStatuses(@Body() data: UpdateProductRequestStatusDto) {
    return this.productRequestsService.updateStatuses(data);
  }

  @Patch(':id')
  @CheckCapability('submit-requests')
  update(@Param('id') id: string, @Body() data: UpdateProductRequestDto) {
    return this.productRequestsService.update(id, data);
  }

  @Delete(':id')
  @CheckCapability('submit-requests')
  remove(@Param('id') id: string) {
    return this.productRequestsService.remove(id);
  }

  @Delete(':id/cancel')
  @CheckCapability('submit-requests')
  cancel(@Param('id') id: string) {
    return this.productRequestsService.cancel(id);
  }

  @Patch(':id/review')
  @CheckCapability('approve-requests')
  review(@Param('id') id: string, @Body() data: ReviewProductRequestDto) {
    return this.productRequestsService.review(id, data);
  }
}
