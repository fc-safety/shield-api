import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/auth/auth.guard';
import { GetStartedFormDto } from './dto/get-started-form.dto';
import { LandingService } from './landing.service';

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Public()
  @Throttle({
    default: {
      // 1 every 15 seconds.
      limit: 1,
      ttl: 15 * 1000,
    },
  })
  @Post('get-started')
  async getStarted(@Body() body: GetStartedFormDto) {
    return this.landingService.handleGetStartedFormSubmission(body);
  }
}
