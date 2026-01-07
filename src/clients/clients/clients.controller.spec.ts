import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;

  const mockClientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findUserOrganization: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    duplicateDemo: jest.fn(),
    clearInspectionsForDemoClient: jest.fn(),
    generateInspectionsForDemoClient: jest.fn(),
    renewNoncompliantDemoAssets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: ClientsService, useValue: mockClientsService },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
