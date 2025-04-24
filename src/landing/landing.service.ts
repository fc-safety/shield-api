import { Injectable } from '@nestjs/common';
import { GetStartedFormDto } from './dto/get-started-form.dto';

@Injectable()
export class LandingService {
  async handleGetStartedFormSubmission(data: GetStartedFormDto) {
    // TODO: Send email with submission data to FC Safety team.
    console.log(data);
    return {
      message: 'Get started',
    };
  }
}
