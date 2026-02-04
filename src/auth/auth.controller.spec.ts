import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { PeopleService } from 'src/clients/people/people.service';
import { AuthController } from './auth.controller';
import { StatelessUserData } from './user.schema';
import { RoleScope } from './scope';

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
    clientId: 'client-123',
    siteId: 'site-123',
    scope: RoleScope.SELF,
    capabilities: [],
  };

  const mockPersonRepresentation = {
    id: 'person-123',
    idpId: 'idp-123',
    siteId: 'site-123',
    allowedSiteIdsStr: 'site-123',
    clientId: 'client-123',
    scope: RoleScope.CLIENT,
    capabilities: ['read-assets', 'write-assets'],
    hasMultiClientScope: false,
    hasMultiSiteScope: true,
  };

  const mockClsService = {
    get: jest.fn().mockReturnValue(mockUser),
  };

  const mockPeopleService = {
    getPersonRepresentation: jest
      .fn()
      .mockResolvedValue(mockPersonRepresentation),
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
        clientId: 'client-123',
        siteId: 'site-123',
        scope: RoleScope.CLIENT,
        capabilities: ['read-assets', 'write-assets'],
        hasMultiClientScope: false,
        hasMultiSiteScope: true,
      });
    });

    it('should call PeopleService.getPersonRepresentation', async () => {
      await controller.getCurrentUser();

      expect(mockPeopleService.getPersonRepresentation).toHaveBeenCalled();
    });

    it('should get user from CLS', async () => {
      await controller.getCurrentUser();

      expect(mockClsService.get).toHaveBeenCalledWith('user');
    });
  });
});
