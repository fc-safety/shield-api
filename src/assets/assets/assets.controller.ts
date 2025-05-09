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
import { Throttle } from '@nestjs/throttler';
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { SendNotificationsBodyDto } from 'src/common/dto/send-notifications-body.dto';
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
  findAll(@Query() queryAssetDto: QueryAssetDto) {
    return this.assetsService.findAll(queryAssetDto);
  }

  @Get('latest-inspection')
  findManyWithLatestInspection(@Query() queryAssetDto: QueryAssetDto) {
    return this.assetsService.findManyWithLatestInspection(queryAssetDto);
  }

  // No more than 10 requests per minute or 100 requests per 15 minutes.
  @Throttle({
    default: { limit: 10, ttl: 1 * 60 * 1000 },
    long: { limit: 100, ttl: 15 * 60 * 1000 },
  })
  @Post(':id/send-reminder-notifications')
  @CheckPolicies(({ user }) => user.can('notify', 'users'))
  sendReminderNotifications(
    @Param('id') id: string,
    @Body() body: SendNotificationsBodyDto,
  ) {
    return this.assetsService.sendReminderNotifications(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
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
