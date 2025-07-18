import { Test, TestingModule } from '@nestjs/testing';
import { ClientNotificationsProcessor } from './client-notifications.processor';

describe('ClientNotificationsProcessor', () => {
  let provider: ClientNotificationsProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientNotificationsProcessor],
    }).compile();

    provider = module.get<ClientNotificationsProcessor>(
      ClientNotificationsProcessor,
    );
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
