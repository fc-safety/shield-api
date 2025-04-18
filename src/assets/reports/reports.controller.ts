import { Controller, Get, Param, Res } from '@nestjs/common';
import { format } from 'date-fns';
import { Response } from 'express';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { streamToCsv } from 'src/common/stream-utils';
import { ReportsService } from './reports.service';

@Controller('reports')
@CheckIsAuthenticated()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAllReports() {
    return this.reportsService.findAllReports();
  }

  @Get(':id')
  findOneReport(@Param('id') id: string) {
    return this.reportsService.buildReport(id);
  }

  @Get(':id/csv')
  async findOneReportCsv(@Param('id') id: string, @Res() res: Response) {
    const stream = await this.reportsService.buildReportCsv(id);
    streamToCsv(stream, res, {
      filename: `report-${id}-${format(new Date(), 'yyyy_MM_dd_HH_mm_ss')}.csv`,
    });
  }
}
