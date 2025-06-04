import { Controller, Get, Query } from '@nestjs/common';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { QueryComplianceHistoryDto } from './dto/query-compliance-history.dto';
import { StatsService } from './stats.service';

@Controller('stats')
@CheckIsAuthenticated()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('compliance-history')
  async getComplianceHistory(
    @Query() queryComplianceHistoryDto: QueryComplianceHistoryDto,
  ) {
    return this.statsService.getComplianceHistoryByMonth(
      queryComplianceHistoryDto,
    );
  }
}
