import { Test, TestingModule } from '@nestjs/testing';
import { ClientAccessController } from './client-access.controller';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessController', () => {
  let controller: ClientAccessController;

  const mockClientAccessService = {
    getMyClientAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientAccessController],
      providers: [
        { provide: ClientAccessService, useValue: mockClientAccessService },
      ],
    }).compile();

    controller = module.get<ClientAccessController>(ClientAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyClientAccess', () => {
    it('should return client access for current user', async () => {
      const mockAccesses = [{ id: 'access-1' }];
      mockClientAccessService.getMyClientAccess.mockResolvedValue(mockAccesses);

      const result = await controller.getMyClientAccess();

      expect(result).toEqual(mockAccesses);
    });
  });
});
