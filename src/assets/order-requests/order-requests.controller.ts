import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CheckResourcePermissions } from 'src/auth/policies.guard';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
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
  findAll() {
    return this.orderRequestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderRequestsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateOrderRequestDto) {
    return this.orderRequestsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderRequestsService.remove(id);
  }
}
