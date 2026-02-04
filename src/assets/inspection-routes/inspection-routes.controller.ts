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
import { CreateInspectionRoutePointDto } from './dto/create-inspection-route-point.dto';
import { CreateInspectionRouteDto } from './dto/create-inspection-route.dto';
import { QueryInspectionRouteDto } from './dto/query-inspection-route.dto';
import { ReorderInspectionRoutePointsDto } from './dto/reorder-inspection-route-points.dto';
import { UpdateInspectionRoutePointDto } from './dto/update-inspection-route-point.dto';
import { UpdateInspectionRouteDto } from './dto/update-inspection-route.dto';
import { InspectionRoutesService } from './inspection-routes.service';

@Controller('inspection-routes')
@CheckAnyCapability('manage-routes', 'perform-inspections')
export class InspectionRoutesController {
  constructor(
    private readonly inspectionRoutesService: InspectionRoutesService,
  ) {}

  @Post()
  @CheckCapability('manage-routes')
  create(@Body() createInspectionRouteDto: CreateInspectionRouteDto) {
    return this.inspectionRoutesService.create(createInspectionRouteDto);
  }

  @Get()
  findAll(@Query() query?: QueryInspectionRouteDto) {
    return this.inspectionRoutesService.findAll(query);
  }

  @Get('asset/:assetId')
  findAllForAssetId(@Param('assetId') assetId: string) {
    return this.inspectionRoutesService.findAllForAssetId(assetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionRoutesService.findOne(id);
  }

  @Patch(':id')
  @CheckCapability('manage-routes')
  update(
    @Param('id') id: string,
    @Body() updateInspectionRouteDto: UpdateInspectionRouteDto,
  ) {
    return this.inspectionRoutesService.update(id, updateInspectionRouteDto);
  }

  @Delete(':id')
  @CheckCapability('manage-routes')
  remove(@Param('id') id: string) {
    return this.inspectionRoutesService.remove(id);
  }

  @Post(':id/points')
  @CheckCapability('manage-routes')
  createPoint(
    @Param('id') id: string,
    @Body() createInspectionRoutePointDto: CreateInspectionRoutePointDto,
  ) {
    return this.inspectionRoutesService.createPoint(
      id,
      createInspectionRoutePointDto,
    );
  }

  @Get(':id/points')
  findAllPoints(@Param('id') id: string) {
    return this.inspectionRoutesService.findAllPoints(id);
  }

  @Get(':id/points/:pointId')
  findOnePoint(@Param('id') id: string, @Param('pointId') pointId: string) {
    return this.inspectionRoutesService.findOnePoint(id, pointId);
  }

  @Patch(':id/points/:pointId')
  @CheckCapability('manage-routes')
  updatePoint(
    @Param('id') id: string,
    @Param('pointId') pointId: string,
    @Body() updateInspectionRoutePointDto: UpdateInspectionRoutePointDto,
  ) {
    return this.inspectionRoutesService.updatePoint(
      id,
      pointId,
      updateInspectionRoutePointDto,
    );
  }

  @Delete(':id/points/:pointId')
  @CheckCapability('manage-routes')
  removePoint(@Param('id') id: string, @Param('pointId') pointId: string) {
    return this.inspectionRoutesService.removePoint(id, pointId);
  }

  @Post(':id/points/reorder')
  @CheckCapability('manage-routes')
  reorderPoints(
    @Param('id') id: string,
    @Body() reorderInspectionRoutePointsDto: ReorderInspectionRoutePointsDto,
  ) {
    return this.inspectionRoutesService.reorderPoints(
      id,
      reorderInspectionRoutePointsDto,
    );
  }
}
