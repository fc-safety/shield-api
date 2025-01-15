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
import { QueryAlertDto } from '../alerts/dto/query-alert.dto';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { SetupAssetDto } from './dto/setup-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateSetupAssetDto } from './dto/update-setup-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(@Query() queryAssetDto?: QueryAssetDto) {
    return this.assetsService.findAll(queryAssetDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Get(':id/alerts')
  findAlerts(@Param('id') id: string, @Query() queryAlertDto?: QueryAlertDto) {
    return this.assetsService.findAlerts(id, queryAlertDto);
  }

  @Post(':id/setup')
  setup(@Param('id') id: string, @Body() setupAssetDto: SetupAssetDto) {
    return this.assetsService.setup(id, setupAssetDto);
  }

  @Patch(':id/setup')
  updateSetup(
    @Param('id') id: string,
    @Body() updateSetupAssetDto: UpdateSetupAssetDto,
  ) {
    return this.assetsService.updateSetup(id, updateSetupAssetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
