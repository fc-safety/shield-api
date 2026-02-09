import { Test, TestingModule } from '@nestjs/testing';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

describe('MembersController', () => {
  let controller: MembersController;

  const mockMembersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    invite: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
    addRole: jest.fn(),
    remove: jest.fn(),
    removeRole: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: mockMembersService }],
    }).compile();

    controller = module.get<MembersController>(MembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
