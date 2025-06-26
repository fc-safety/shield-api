import { Controller, Get, Query } from '@nestjs/common';
import { CheckPublicPolicies } from 'src/auth/policies.guard';
import { firstOf } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { GetClientStatusDto } from './dto/get-client-status.dto';
import { GetTagUrlDto } from './dto/get-tag-url.dto';
import { M2mService } from './m2m.service';

@Controller('m2m')
@CheckPublicPolicies(async ({ request, moduleRef }) => {
  const apiKey = firstOf(request.headers['x-api-key']);
  if (!apiKey) {
    return false;
  }

  const config = moduleRef.get(ApiConfigService, { strict: false });

  return config.get('M2M_API_KEYS').includes(apiKey);
})
export class M2mController {
  constructor(private readonly m2mService: M2mService) {}

  @Get('client-status')
  getClientStatus(@Query() getClientStatusDto: GetClientStatusDto) {
    return this.m2mService.getClientStatus(getClientStatusDto);
  }

  @Get('tag-url')
  getTagUrl(@Query() getTagUrlDto: GetTagUrlDto) {
    return this.m2mService.getTagUrl(getTagUrlDto);
  }
}
