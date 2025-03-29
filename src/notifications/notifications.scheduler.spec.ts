import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsScheduler } from './notifications.scheduler';

describe('NotificationsScheduler', () => {
  let provider: NotificationsScheduler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsScheduler],
    }).compile();

    provider = module.get<NotificationsScheduler>(NotificationsScheduler);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
