import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ApiConfigService } from 'src/config/api-config.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildUserFromToken, StatelessUserData } from './user.schema';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AUTH_JWKS_URI')
        return 'https://example.com/.well-known/jwks.json';
      return 'test-value';
    }),
  };

  const mockPersonUpdate = jest.fn();
  const mockPersonUpsert = jest.fn();

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getOrSet: jest
      .fn()
      .mockImplementation((_key: string, factory: () => Promise<unknown>) =>
        factory(),
      ),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      signingKey: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      person: {
        upsert: mockPersonUpsert,
        update: mockPersonUpdate,
      },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildUserFromToken – phoneNumber extraction', () => {
    const basePayload = {
      sub: 'idp-123',
      email: 'test@example.com',
      preferred_username: 'testuser',
      given_name: 'Test',
      family_name: 'User',
    };

    it('should set phoneNumber to undefined when attributes is missing', () => {
      const user = buildUserFromToken(basePayload);
      expect(user.phoneNumber).toBeUndefined();
    });

    it('should set phoneNumber to undefined when attributes is empty object', () => {
      const user = buildUserFromToken({ ...basePayload, attributes: {} });
      expect(user.phoneNumber).toBeUndefined();
    });

    it('should set phoneNumber to null when phoneNumber array is empty', () => {
      const user = buildUserFromToken({
        ...basePayload,
        attributes: { phoneNumber: [] },
      });
      expect(user.phoneNumber).toBeNull();
    });

    it('should extract the first phoneNumber from the array', () => {
      const user = buildUserFromToken({
        ...basePayload,
        attributes: { phoneNumber: ['+15551234567'] },
      });
      expect(user.phoneNumber).toBe('+15551234567');
    });

    it('should use only the first element when multiple phone numbers exist', () => {
      const user = buildUserFromToken({
        ...basePayload,
        attributes: { phoneNumber: ['+15551234567', '+15559999999'] },
      });
      expect(user.phoneNumber).toBe('+15551234567');
    });
  });

  describe('savePersonFromUserData – phoneNumber sync', () => {
    const existingPerson = {
      id: 'person-1',
      idpId: 'idp-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      username: 'testuser',
      phoneNumber: null,
    };

    const baseUserData: StatelessUserData = {
      idpId: 'idp-123',
      email: 'test@example.com',
      username: 'testuser',
      givenName: 'Test',
      familyName: 'User',
    };

    beforeEach(() => {
      mockPersonUpsert.mockResolvedValue(existingPerson);
    });

    it('should not trigger update when phoneNumber is undefined (attributes missing from token)', async () => {
      // phoneNumber undefined = we don't know the phone number, so don't touch it
      const userData: StatelessUserData = { ...baseUserData };
      // phoneNumber is implicitly undefined

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpsert).toHaveBeenCalled();
      expect(mockPersonUpdate).not.toHaveBeenCalled();
    });

    it('should not trigger update when phoneNumber is undefined even if person has one', async () => {
      const personWithPhone = {
        ...existingPerson,
        phoneNumber: '+15551234567',
      };
      mockPersonUpsert.mockResolvedValue(personWithPhone);

      const userData: StatelessUserData = { ...baseUserData };

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpdate).not.toHaveBeenCalled();
    });

    it('should trigger update when phoneNumber is null and person has a phone number', async () => {
      const personWithPhone = {
        ...existingPerson,
        phoneNumber: '+15551234567',
      };
      mockPersonUpsert.mockResolvedValue(personWithPhone);
      mockPersonUpdate.mockResolvedValue({
        ...personWithPhone,
        phoneNumber: null,
      });

      // null = token explicitly says phone number is empty
      const userData: StatelessUserData = {
        ...baseUserData,
        phoneNumber: null,
      };

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phoneNumber: null }),
        }),
      );
    });

    it('should trigger update when phoneNumber differs from stored value', async () => {
      mockPersonUpsert.mockResolvedValue(existingPerson);
      mockPersonUpdate.mockResolvedValue({
        ...existingPerson,
        phoneNumber: '+15551234567',
      });

      const userData: StatelessUserData = {
        ...baseUserData,
        phoneNumber: '+15551234567',
      };

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phoneNumber: '+15551234567' }),
        }),
      );
    });

    it('should not trigger update when phoneNumber matches stored value', async () => {
      const personWithPhone = {
        ...existingPerson,
        phoneNumber: '+15551234567',
      };
      mockPersonUpsert.mockResolvedValue(personWithPhone);

      const userData: StatelessUserData = {
        ...baseUserData,
        phoneNumber: '+15551234567',
      };

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpdate).not.toHaveBeenCalled();
    });

    it('should not trigger update when phoneNumber is null and person already has null', async () => {
      // person.phoneNumber is already null
      mockPersonUpsert.mockResolvedValue(existingPerson);

      const userData: StatelessUserData = {
        ...baseUserData,
        phoneNumber: null,
      };

      await service.savePersonFromUserData(userData);

      expect(mockPersonUpdate).not.toHaveBeenCalled();
    });
  });
});
