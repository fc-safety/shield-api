import { BadRequestException, Controller, Get } from '@nestjs/common';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { SupportService } from './support.service';

@Controller('support')
@CheckIsAuthenticated()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('identify')
  async identifyUser() {
    const payload = await this.supportService.identifyUser();
    if (!payload) {
      throw new BadRequestException('User not found.');
    }

    return payload;
  }
}
