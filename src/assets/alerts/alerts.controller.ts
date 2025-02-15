import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { AlertsService } from './alerts.service';
import { QueryAlertDto } from './dto/query-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@Controller('alerts')
@CheckResourcePermissions('alerts')
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

  @CheckPolicies((context) => context.user.canUpdate('alerts'))
  @Post(':id/resolve')
  resolveAlert(
    @Param('id') id: string,
    @Body() resolveAlertDto: ResolveAlertDto,
  ) {
    return this.alertsService.resolveAlert(id, resolveAlertDto);
  }
}
