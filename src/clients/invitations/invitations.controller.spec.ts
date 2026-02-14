import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { CreateInvitationsDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

describe('InvitationsController', () => {
  let controller: InvitationsController;

  const mockInvitationsService = {
    createBulk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    validateCode: jest.fn(),
    accept: jest.fn(),
    revoke: jest.fn(),
    resend: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create invitations in bulk', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };
      const expectedResult = [
        {
          id: 'inv-1',
          code: 'abc123',
          inviteUrl: 'http://localhost:3000/accept-invite/abc123',
        },
      ];

      mockInvitationsService.createBulk.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(result).toEqual(expectedResult);
      expect(mockInvitationsService.createBulk).toHaveBeenCalledWith(dto);
    });
  });

  describe('resend', () => {
    it('should resend an invitation email', async () => {
      const expectedResult = {
        id: 'inv-1',
        code: 'abc123',
        inviteUrl: 'http://localhost:3000/accept-invite/abc123',
      };

      mockInvitationsService.resend.mockResolvedValue(expectedResult);

      const result = await controller.resend('inv-1');

      expect(result).toEqual(expectedResult);
      expect(mockInvitationsService.resend).toHaveBeenCalledWith('inv-1');
    });
  });

  describe('validateCode', () => {
    it('should validate an invitation code', async () => {
      const expectedResult = {
        valid: true,
        client: { id: 'client-1', name: 'Test Client' },
      };

      mockInvitationsService.validateCode.mockResolvedValue(expectedResult);

      const result = await controller.validateCode('abc123');

      expect(result).toEqual(expectedResult);
      expect(mockInvitationsService.validateCode).toHaveBeenCalledWith(
        'abc123',
      );
    });
  });
});
