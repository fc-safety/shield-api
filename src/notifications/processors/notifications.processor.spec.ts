import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  let provider: NotificationsProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsProcessor],
    }).compile();

    provider = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
