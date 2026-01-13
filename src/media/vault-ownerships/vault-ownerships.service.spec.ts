import { Test, TestingModule } from '@nestjs/testing';
import { VaultOwnershipsService } from './vault-ownerships.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('VaultOwnershipsService', () => {
  let service: VaultOwnershipsService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      vaultOwnership: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
    forContext: jest.fn().mockResolvedValue({
      vaultOwnership: {
        findManyForPage: jest.fn(),
        findUnique: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultOwnershipsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VaultOwnershipsService>(VaultOwnershipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
