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
import { ConsumablesService } from './consumables.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';

@Controller('consumables')
@CheckResourcePermissions('consumables')
export class ConsumablesController {
  constructor(private readonly consumablesService: ConsumablesService) {}

  @Post()
  create(@Body() createConsumableDto: CreateConsumableDto) {
    return this.consumablesService.create(createConsumableDto);
  }

  @Get()
  findAll() {
    return this.consumablesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consumablesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateConsumableDto: UpdateConsumableDto,
  ) {
    return this.consumablesService.update(+id, updateConsumableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consumablesService.remove(+id);
  }
}
