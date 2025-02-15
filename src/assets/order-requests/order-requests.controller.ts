import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CheckResourcePermissions } from 'src/auth/policies.guard';
import { getViewContext } from 'src/common/utils';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
import { QueryOrderRequestDto } from './dto/query-order-request.dto';
import { UpdateOrderRequestStatusDto } from './dto/update-order-request-status.dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';
import { OrderRequestsService } from './order-requests.service';

@Controller('order-requests')
@CheckResourcePermissions('product-requests')
export class OrderRequestsController {
  constructor(private readonly orderRequestsService: OrderRequestsService) {}

  @Post()
  create(@Body() data: CreateOrderRequestDto) {
    return this.orderRequestsService.create(data);
  }

  @Get()
  findAll(@Query() query: QueryOrderRequestDto, @Req() req: Request) {
    const context = getViewContext(req);
    return this.orderRequestsService.findAll(query, context);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderRequestsService.findOne(id);
  }

  @Patch('statuses')
  updateStatuses(@Body() data: UpdateOrderRequestStatusDto) {
    return this.orderRequestsService.updateStatuses(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateOrderRequestDto) {
    return this.orderRequestsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderRequestsService.remove(id);
  }

  @Delete(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.orderRequestsService.cancel(id);
  }
}
