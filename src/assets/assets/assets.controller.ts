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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { SetupAssetDto } from './dto/setup-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateSetupAssetDto } from './dto/update-setup-asset.dto';

@Controller('assets')
@CheckResourcePermissions('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(
    @Query() queryAssetDto: QueryAssetDto,
    @ViewCtx() context: ViewContext,
  ) {
    return this.assetsService.findAll(queryAssetDto, context);
  }

  @Get('latest-inspection')
  findManyWithLatestInspection(
    @Query() queryAssetDto: QueryAssetDto,
    @ViewCtx() context: ViewContext,
  ) {
    return this.assetsService.findManyWithLatestInspection(
      queryAssetDto,
      context,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ViewCtx() context: ViewContext) {
    return this.assetsService.findOne(id, context);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @CheckPolicies((context) => context.user.canUpdate('assets'))
  @Post(':id/add-tag')
  addTag(
    @Param('id') id: string,
    @Query('tagExternalId') tagExternalId: string,
    @Query('tagSerialNumber') tagSerialNumber: string,
  ) {
    return this.assetsService.addTag(id, tagExternalId, tagSerialNumber);
  }

  @CheckPolicies((context) => context.user.can('setup', 'assets'))
  @Post(':id/setup')
  setup(@Param('id') id: string, @Body() setupAssetDto: SetupAssetDto) {
    return this.assetsService.setup(id, setupAssetDto);
  }

  @CheckPolicies((context) => context.user.can('setup', 'assets'))
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
