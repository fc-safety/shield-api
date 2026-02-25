import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CheckAnyCapability, CheckCapability } from 'src/auth/policies.guard';
import { AlertsService } from './alerts.service';
import { AttachInspectionImageDto } from './dto/attach-inspection-image.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@Controller('alerts')
@CheckAnyCapability('resolve-alerts', 'view-reports')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Query() queryAlertDto?: QueryAlertDto) {
    return this.alertsService.findAll(queryAlertDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @CheckCapability('resolve-alerts')
  @Post(':id/resolve')
  resolveAlert(
    @Param('id') id: string,
    @Body() resolveAlertDto: ResolveAlertDto,
  ) {
    return this.alertsService.resolveAlert(id, resolveAlertDto);
  }

  @CheckCapability('perform-inspections')
  @Post(':id/attach-inspection-image')
  attachInspectionImage(
    @Param('id') id: string,
    @Body() body: AttachInspectionImageDto,
  ) {
    return this.alertsService.attachInspectionImage(
      id,
      body.inspectionImageUrl,
    );
  }
}
