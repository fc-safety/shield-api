import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { RolesService } from 'src/admin/roles/roles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetQuestionsService } from 'src/products/asset-questions/asset-questions.service';
import { UsersService } from '../users/users.service';
import { ClientsService } from './clients.service';
import { GenerateDemoInspectionsDto } from './dto/generate-demo-inspections.dto';

describe('ClientsService', () => {
  let service: ClientsService;
  let mockPrismaService: any;
  let mockAssetQuestionsService: any;
  let mockKeycloakService: any;

  beforeEach(async () => {
    mockPrismaService = {
      txForAdminOrUser: jest.fn(),
    };

    mockAssetQuestionsService = {
      findByAsset: jest.fn(),
    };

    mockKeycloakService = {
      findUsersByAttribute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: ClsService, useValue: { get: jest.fn() } },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: AssetQuestionsService, useValue: mockAssetQuestionsService },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInspectionsForDemoClient', () => {
    it('should throw error for non-demo clients', async () => {
      const mockTx = {
        client: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'client-1',
            demoMode: false,
          }),
        },
      };

      mockPrismaService.txForAdminOrUser.mockImplementation((fn: any) => fn(mockTx));

      await expect(
        service.generateInspectionsForDemoClient(
          GenerateDemoInspectionsDto.create({ clientId: 'client-1' }),
        ),
      ).rejects.toThrow('Client must be in demo mode to perform this action.');
    });

    it('should generate inspections with setup and inspection questions for demo clients', async () => {
      const mockClient = {
        id: 'client-1',
        name: 'Demo Client',
        externalId: 'ext-client-1',
        demoMode: true,
        sites: [
          {
            id: 'site-1',
            assets: [
              {
                id: 'asset-1',
                serialNumber: 'SN123',
                siteId: 'site-1',
                setupOn: null,
                product: { id: 'product-1' },
              },
            ],
          },
        ],
      };

      const mockKeycloakUsers = {
        results: [
          {
            id: 'kc-user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            attributes: { user_id: ['person-1'] },
          },
        ],
      };

      const mockSetupQuestions = [
        {
          id: 'question-1',
          valueType: 'BINARY',
          prompt: 'Is the asset installed?',
        },
        {
          id: 'question-2',
          valueType: 'TEXT',
          prompt: 'What is the serial number?',
        },
      ];

      const mockInspectionQuestions = [
        {
          id: 'question-3',
          valueType: 'BINARY',
          prompt: 'Is the asset functioning properly?',
        },
        {
          id: 'question-4',
          valueType: 'TEXTAREA',
          prompt: 'Additional notes',
        },
      ];

      const mockTx = {
        client: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockClient),
        },
        person: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
          }),
        },
        asset: {
          update: jest.fn(),
        },
        assetQuestionResponse: {
          createMany: jest.fn(),
        },
        inspection: {
          create: jest.fn().mockImplementation((data) => ({
            id: `inspection-${Math.random()}`,
            ...data.data,
          })),
        },
      };

      mockPrismaService.txForAdminOrUser.mockImplementation((fn: any) => fn(mockTx));
      mockKeycloakService.findUsersByAttribute.mockResolvedValue(mockKeycloakUsers);
      
      // Mock different responses for setup vs inspection questions
      mockAssetQuestionsService.findByAsset.mockImplementation((assetId, type) => {
        if (type === 'SETUP') {
          return Promise.resolve(mockSetupQuestions);
        } else if (type === 'INSPECTION') {
          return Promise.resolve(mockInspectionQuestions);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateInspectionsForDemoClient(
        GenerateDemoInspectionsDto.create({ clientId: 'client-1', monthsBack: 12 }),
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('inspectionsCount');
      expect(result.assetsInvolved).toBe(1);
      expect(result.inspectorsUsed).toBe(1);

      // Verify asset was set up
      expect(mockTx.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { setupOn: expect.any(Date) },
      });

      // Verify setup questions were answered
      expect(mockTx.assetQuestionResponse.createMany).toHaveBeenCalled();
      const setupResponsesCall = mockTx.assetQuestionResponse.createMany.mock.calls[0][0];
      expect(setupResponsesCall.data).toHaveLength(2);
      expect(setupResponsesCall.data[0]).toMatchObject({
        assetQuestionId: 'question-1',
        assetId: 'asset-1',
        value: expect.any(Boolean),
      });

      // Verify inspections were created with responses
      expect(mockTx.inspection.create).toHaveBeenCalled();
      const inspectionCreateCalls = mockTx.inspection.create.mock.calls;
      
      // Check that at least some inspections have responses
      const inspectionsWithResponses = inspectionCreateCalls.filter(
        call => call[0].data.responses?.createMany?.data?.length > 0
      );
      expect(inspectionsWithResponses.length).toBeGreaterThan(0);
      
      // Verify the structure of inspection responses
      if (inspectionsWithResponses.length > 0) {
        const responseData = inspectionsWithResponses[0][0].data.responses.createMany.data;
        expect(responseData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              assetQuestionId: expect.stringMatching(/^question-[34]$/),
              value: expect.anything(),
              responderId: 'person-1',
            }),
          ])
        );
      }
    });
  });
});