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
import { ConsumablesService } from './consumables.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { QueryConsumableDto } from './dto/query-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';

@Controller('consumables')
@CheckAnyCapability('manage-assets', 'perform-inspections', 'view-reports')
export class ConsumablesController {
  constructor(private readonly consumablesService: ConsumablesService) {}

  @Post()
  @CheckCapability('manage-assets')
  create(@Body() createConsumableDto: CreateConsumableDto) {
    return this.consumablesService.create(createConsumableDto);
  }

  @Get()
  findAll(@Query() query: QueryConsumableDto) {
    return this.consumablesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consumablesService.findOne(id);
  }

  @Patch(':id')
  @CheckCapability('manage-assets')
  update(
    @Param('id') id: string,
    @Body() updateConsumableDto: UpdateConsumableDto,
  ) {
    return this.consumablesService.update(id, updateConsumableDto);
  }

  @Delete(':id')
  @CheckCapability('manage-assets')
  remove(@Param('id') id: string) {
    return this.consumablesService.remove(id);
  }
}
