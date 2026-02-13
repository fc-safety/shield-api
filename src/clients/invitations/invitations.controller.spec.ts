import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

describe('InvitationsController', () => {
  let controller: InvitationsController;

  const mockInvitationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    validateCode: jest.fn(),
    accept: jest.fn(),
    revoke: jest.fn(),
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
    it('should create an invitation', async () => {
      const dto = { expiresInDays: 7 };
      const expectedResult = {
        id: 'inv-1',
        code: 'abc123',
        inviteUrl: 'http://localhost:3000/accept-invite/abc123',
      };

      mockInvitationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(result).toEqual(expectedResult);
      expect(mockInvitationsService.create).toHaveBeenCalledWith(dto);
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
