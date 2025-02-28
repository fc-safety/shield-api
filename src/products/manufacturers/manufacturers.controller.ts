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
import { CheckResourcePermissions } from 'src/auth/policies.guard';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { QueryManufacturerDto } from './dto/query-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { ManufacturersService } from './manufacturers.service';

@Controller('manufacturers')
@CheckResourcePermissions('manufacturers')
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  @Post()
  create(@Body() createManufacturerDto: CreateManufacturerDto) {
    return this.manufacturersService.create(createManufacturerDto);
  }

  @Get()
  findAll(@Query() queryManufacturerDto?: QueryManufacturerDto) {
    return this.manufacturersService.findAll(queryManufacturerDto);
  }

  @Get('generic')
  getOrCreateGeneric() {
    return this.manufacturersService.getOrCreateGeneric();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.manufacturersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateManufacturerDto: UpdateManufacturerDto,
  ) {
    return this.manufacturersService.update(id, updateManufacturerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.manufacturersService.remove(id);
  }
}
