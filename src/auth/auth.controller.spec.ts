import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { PeopleService } from 'src/clients/people/people.service';
import { AuthController } from './auth.controller';
import { StatelessUserData } from './user.schema';
import { RoleScope } from './utils/scope';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUser: StatelessUserData = {
    idpId: 'idp-123',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    picture: 'https://example.com/pic.jpg',
  };

  const mockPersonBasicInfo = {
    id: 'person-123',
    idpId: 'idp-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    clientAccess: [
      {
        clientId: 'client-123',
        clientName: 'Test Client',
        clientExternalId: 'ext-client-123',
        siteId: 'site-123',
        siteName: 'Test Site',
        isPrimary: true,
        role: {
          id: 'role-123',
          name: 'Admin',
          scope: RoleScope.CLIENT,
          capabilities: ['read-assets', 'write-assets'],
        },
      },
    ],
  };

  const mockClsService = {
    get: jest.fn().mockReturnValue(mockUser),
  };

  const mockPeopleService = {
    getPersonBasicInfo: jest.fn().mockResolvedValue(mockPersonBasicInfo),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ClsService, useValue: mockClsService },
        { provide: PeopleService, useValue: mockPeopleService },
      ],
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
        clientAccess: mockPersonBasicInfo.clientAccess,
      });
    });

    it('should call PeopleService.getPersonBasicInfo', async () => {
      await controller.getCurrentUser();

      expect(mockPeopleService.getPersonBasicInfo).toHaveBeenCalled();
    });

    it('should get user from CLS', async () => {
      await controller.getCurrentUser();

      expect(mockClsService.get).toHaveBeenCalledWith('user');
    });

    it('should return empty clientAccess for users with no client access', async () => {
      mockPeopleService.getPersonBasicInfo.mockResolvedValueOnce({
        ...mockPersonBasicInfo,
        id: null,
        clientAccess: [],
      });

      const result = await controller.getCurrentUser();

      expect(result.personId).toBeNull();
      expect(result.clientAccess).toEqual([]);
    });
  });
});
