import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from './api-cls.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAccessGrant = {
    scope: 'client',
    capabilities: ['read-assets', 'write-assets'],
    clientId: 'client-123',
    siteId: 'site-123',
  };

  const mockPerson = {
    id: 'person-123',
  };

  const mockUser = {
    idpId: 'idp-123',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    picture: 'https://example.com/pic.jpg',
  };

  const mockApiClsService = {
    requireUser: jest.fn().mockReturnValue(mockUser),
    requirePerson: jest.fn().mockReturnValue(mockPerson),
    get: jest.fn((key) => {
      if (key === 'accessGrant') {
        return mockAccessGrant;
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: ApiClsService, useValue: mockApiClsService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return combined user data from token and database', async () => {
      const result = await controller.getCurrentUser();

      expect(result).toEqual({
        idpId: 'idp-123',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        givenName: 'Test',
        familyName: 'User',
        picture: 'https://example.com/pic.jpg',
        personId: 'person-123',
        accessGrant: mockAccessGrant,
      });
    });

    it('should require user from CLS', async () => {
      await controller.getCurrentUser();

      expect(mockApiClsService.requireUser).toHaveBeenCalled();
    });

    it('should require person from CLS', async () => {
      await controller.getCurrentUser();

      expect(mockApiClsService.requirePerson).toHaveBeenCalled();
    });

    it('should handle null access grant from CLS', async () => {
      mockApiClsService.get.mockReturnValueOnce(null);

      const result = await controller.getCurrentUser();

      expect(result.accessGrant).toBeNull();
      expect(mockApiClsService.get).toHaveBeenCalledWith('accessGrant');
    });
  });
});
