import { Test, TestingModule } from '@nestjs/testing';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

describe('LandingController', () => {
  let controller: LandingController;

  const mockLandingService = {
    handleGetStartedFormSubmission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingController],
      providers: [
        { provide: LandingService, useValue: mockLandingService },
      ],
    }).compile();

    controller = module.get<LandingController>(LandingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
