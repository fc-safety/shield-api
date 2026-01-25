import { Test, TestingModule } from '@nestjs/testing';
import { ClientAccessController } from './client-access.controller';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessController', () => {
  let controller: ClientAccessController;

  const mockClientAccessService = {
    getMyClientAccess: jest.fn(),
    getPersonClientAccess: jest.fn(),
    grantClientAccess: jest.fn(),
    updateClientAccess: jest.fn(),
    revokeClientAccess: jest.fn(),
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

  describe('getPersonClientAccess', () => {
    it('should return client access for specified person', async () => {
      const mockAccesses = [{ id: 'access-1' }];
      mockClientAccessService.getPersonClientAccess.mockResolvedValue(
        mockAccesses,
      );

      const result = await controller.getPersonClientAccess('person-1');

      expect(result).toEqual(mockAccesses);
      expect(
        mockClientAccessService.getPersonClientAccess,
      ).toHaveBeenCalledWith('person-1');
    });
  });

  describe('grantClientAccess', () => {
    it('should grant client access to person', async () => {
      const dto = {
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
      };
      const mockAccess = { id: 'new-access', ...dto };
      mockClientAccessService.grantClientAccess.mockResolvedValue(mockAccess);

      const result = await controller.grantClientAccess('person-1', dto);

      expect(result).toEqual(mockAccess);
      expect(mockClientAccessService.grantClientAccess).toHaveBeenCalledWith(
        'person-1',
        dto,
      );
    });
  });

  describe('updateClientAccess', () => {
    it('should update client access', async () => {
      const dto = { siteId: 'new-site-1' };
      const mockAccess = { id: 'access-1', ...dto };
      mockClientAccessService.updateClientAccess.mockResolvedValue(mockAccess);

      const result = await controller.updateClientAccess('access-1', dto);

      expect(result).toEqual(mockAccess);
      expect(mockClientAccessService.updateClientAccess).toHaveBeenCalledWith(
        'access-1',
        dto,
      );
    });
  });

  describe('revokeClientAccess', () => {
    it('should revoke client access', async () => {
      mockClientAccessService.revokeClientAccess.mockResolvedValue(undefined);

      await controller.revokeClientAccess('access-1');

      expect(mockClientAccessService.revokeClientAccess).toHaveBeenCalledWith(
        'access-1',
      );
    });
  });
});
