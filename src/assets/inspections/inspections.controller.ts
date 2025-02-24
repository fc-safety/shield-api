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
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionsService } from './inspections.service';

@Controller('inspections')
@CheckResourcePermissions('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  create(
    @Body() createInspectionDto: CreateInspectionDto,
    @Query('sessionId') sessionId?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.inspectionsService.create(
      createInspectionDto,
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

  @Post('sessions/:id/complete')
  completeSession(@Param('id') id: string) {
    return this.inspectionsService.completeInspectionSession(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInspectionDto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(id, updateInspectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
