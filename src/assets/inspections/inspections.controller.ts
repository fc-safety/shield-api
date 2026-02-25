import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckAnyCapability, CheckCapability } from 'src/auth/policies.guard';
import { INSPECTION_TOKEN_HEADER } from './constants/headers';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionsService } from './inspections.service';

@Controller('inspections')
@CheckAnyCapability('perform-inspections', 'view-reports')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @CheckCapability('perform-inspections')
  create(
    @Body() createInspectionDto: CreateInspectionDto,
    @Query('sessionId') sessionId?: string,
    @Query('routeId') routeId?: string,
    @Headers(INSPECTION_TOKEN_HEADER) inspectionToken?: string,
  ) {
    return this.inspectionsService.create(
      createInspectionDto,
      inspectionToken,
      sessionId,
      routeId,
    );
  }

  @Get()
  findAll(@Query() queryInspectionDto?: QueryInspectionDto) {
    return this.inspectionsService.findAll(queryInspectionDto);
  }

  @Get('active-sessions/asset/:assetId')
  findActiveSessions(@Param('assetId') assetId: string) {
    return this.inspectionsService.findActiveInspectionSessionsForAsset(
      assetId,
    );
  }

  @Get('sessions/:id')
  findActiveSession(@Param('id') id: string) {
    return this.inspectionsService.findInspectionSession(id);
  }

  @Post('sessions/:id/cancel')
  @CheckCapability('perform-inspections')
  cancelSession(@Param('id') id: string) {
    return this.inspectionsService.cancelInspectionSession(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(id);
  }

  @Patch(':id')
  @CheckCapability('perform-inspections')
  update(
    @Param('id') id: string,
    @Body() updateInspectionDto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(id, updateInspectionDto);
  }

  @Delete(':id')
  @CheckCapability('perform-inspections')
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
