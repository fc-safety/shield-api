import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { KeycloakWebhookController } from './keycloak-webhook.controller';
import { KeycloakService } from './keycloak.service';

describe('KeycloakWebhookController', () => {
  let controller: KeycloakWebhookController;
  let keycloakService: jest.Mocked<
    Pick<KeycloakService, 'verifyWebhookSignature'>
  >;
  let prismaService: { bypassRLS: jest.Mock };

  beforeEach(async () => {
    const mockKeycloakService = {
      verifyWebhookSignature: jest.fn(),
    };

    const mockPrismaService = {
      bypassRLS: jest.fn().mockReturnValue({
        person: {
          upsert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeycloakWebhookController],
      providers: [
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<KeycloakWebhookController>(
      KeycloakWebhookController,
    );
    keycloakService = module.get(KeycloakService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleEvent', () => {
    const createMockRequest = (body: object) => {
      const rawBody = Buffer.from(JSON.stringify(body));
      return { rawBody } as any;
    };

    it('should return received: true with valid signature', async () => {
      keycloakService.verifyWebhookSignature.mockReturnValue(true);

      const event = { type: 'LOGIN', userId: 'test-user', time: 1234567890 };
      const req = createMockRequest(event);

      const result = await controller.handleEvent(
        req,
        'valid-sig',
        event as any,
      );

      expect(result).toEqual({ received: true });
      expect(keycloakService.verifyWebhookSignature).toHaveBeenCalledWith(
        req.rawBody,
        'valid-sig',
      );
    });

    it('should throw UnauthorizedException with invalid signature', async () => {
      keycloakService.verifyWebhookSignature.mockReturnValue(false);

      const event = { type: 'LOGIN', userId: 'test-user', time: 1234567890 };
      const req = createMockRequest(event);

      await expect(
        controller.handleEvent(req, 'invalid-sig', event as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with missing signature', async () => {
      keycloakService.verifyWebhookSignature.mockReturnValue(false);

      const event = { type: 'LOGIN', userId: 'test-user', time: 1234567890 };
      const req = createMockRequest(event);

      await expect(
        controller.handleEvent(req, undefined as any, event as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle missing rawBody gracefully', async () => {
      keycloakService.verifyWebhookSignature.mockReturnValue(true);

      const event = { type: 'LOGIN', userId: 'test-user', time: 1234567890 };
      const req = { rawBody: undefined } as any;

      const result = await controller.handleEvent(
        req,
        'valid-sig',
        event as any,
      );

      expect(result).toEqual({ received: true });
      expect(keycloakService.verifyWebhookSignature).toHaveBeenCalledWith(
        Buffer.from(''),
        'valid-sig',
      );
    });

    describe('user events', () => {
      const createMockRequest = (body: object) => {
        const rawBody = Buffer.from(JSON.stringify(body));
        return { rawBody } as any;
      };

      it('should create person on USER-CREATE event if not exists', async () => {
        keycloakService.verifyWebhookSignature.mockReturnValue(true);

        const mockPrisma = {
          person: {
            upsert: jest.fn().mockResolvedValue({
              id: 'new-person-id',
              idpId: '13ee9dda-f682-4583-a3ac-eb8d7e734ac9',
            }),
          },
        };
        prismaService.bypassRLS.mockReturnValue(mockPrisma);

        const representation = {
          username: 'bob.marley@gibsonops.com',
          firstName: 'Bob',
          lastName: 'Marley',
          email: 'bob.marley@gibsonops.com',
          emailVerified: true,
          enabled: true,
          attributes: {
            client_id: ['z2q1bjupejrlun8zlrhposr6'],
            site_id: ['i13sopxfk11qpwkcbzmoy92y'],
          },
        };

        const event = {
          type: 'admin.USER-CREATE',
          realmId: '088994d1-f4c7-4083-a536-84d9ded125d9',
          resourceId: '13ee9dda-f682-4583-a3ac-eb8d7e734ac9',
          representation: JSON.stringify(representation),
          time: 1770248932883,
        };
        const req = createMockRequest(event);

        const result = await controller.handleEvent(
          req,
          'valid-sig',
          event as any,
        );

        expect(result).toEqual({ received: true });
        expect(mockPrisma.person.upsert).toHaveBeenCalledWith({
          where: { idpId: '13ee9dda-f682-4583-a3ac-eb8d7e734ac9' },
          update: expect.objectContaining({
            firstName: 'Bob',
            lastName: 'Marley',
            email: 'bob.marley@gibsonops.com',
            username: 'bob.marley@gibsonops.com',
            active: true,
          }),
          create: expect.objectContaining({
            idpId: '13ee9dda-f682-4583-a3ac-eb8d7e734ac9',
            firstName: 'Bob',
            lastName: 'Marley',
            email: 'bob.marley@gibsonops.com',
            username: 'bob.marley@gibsonops.com',
            active: true,
          }),
        });
      });

      it('should upsert person on USER-UPDATE event', async () => {
        keycloakService.verifyWebhookSignature.mockReturnValue(true);

        const mockPrisma = {
          person: {
            upsert: jest.fn().mockResolvedValue({
              id: 'test-user-id',
              idpId: 'keycloak-id',
            }),
          },
        };
        prismaService.bypassRLS.mockReturnValue(mockPrisma);

        const representation = {
          username: 'new.email@example.com',
          firstName: 'New',
          lastName: 'Name',
          email: 'new.email@example.com',
          enabled: true,
          attributes: {
            phone_number: ['555-1234'],
            user_position: ['Manager'],
          },
        };

        const event = {
          type: 'admin.USER-UPDATE',
          realmId: 'test-realm',
          resourceId: 'keycloak-id',
          representation: JSON.stringify(representation),
          time: Date.now(),
        };
        const req = createMockRequest(event);

        await controller.handleEvent(req, 'valid-sig', event as any);

        expect(mockPrisma.person.upsert).toHaveBeenCalledWith({
          where: { idpId: 'keycloak-id' },
          update: expect.objectContaining({
            firstName: 'New',
            lastName: 'Name',
            email: 'new.email@example.com',
            phoneNumber: '555-1234',
            position: 'Manager',
          }),
          create: expect.objectContaining({
            idpId: 'keycloak-id',
            firstName: 'New',
            lastName: 'Name',
            email: 'new.email@example.com',
            phoneNumber: '555-1234',
            position: 'Manager',
          }),
        });
      });

      it('should skip sync if required fields are missing', async () => {
        keycloakService.verifyWebhookSignature.mockReturnValue(true);

        const mockPrisma = {
          person: {
            upsert: jest.fn(),
          },
        };
        prismaService.bypassRLS.mockReturnValue(mockPrisma);

        const representation = {
          username: 'unknown@example.com',
          // missing firstName, lastName, email
        };

        const event = {
          type: 'admin.USER-CREATE',
          resourceId: 'keycloak-id',
          representation: JSON.stringify(representation),
          time: Date.now(),
        };
        const req = createMockRequest(event);

        await controller.handleEvent(req, 'valid-sig', event as any);

        expect(mockPrisma.person.upsert).not.toHaveBeenCalled();
      });

      it('should skip sync if representation is missing', async () => {
        keycloakService.verifyWebhookSignature.mockReturnValue(true);

        const mockPrisma = {
          person: {
            upsert: jest.fn(),
          },
        };
        prismaService.bypassRLS.mockReturnValue(mockPrisma);

        const event = {
          type: 'admin.USER-CREATE',
          resourceId: 'keycloak-id',
          time: Date.now(),
        };
        const req = createMockRequest(event);

        await controller.handleEvent(req, 'valid-sig', event as any);

        expect(mockPrisma.person.upsert).not.toHaveBeenCalled();
      });
    });
  });
});

describe('HMAC signature verification', () => {
  it('should produce matching signatures with same secret and body', () => {
    const secret = 'test-secret';
    const body = Buffer.from('{"type":"LOGIN"}');
    const signature1 = createHmac('sha256', secret).update(body).digest('hex');
    const signature2 = createHmac('sha256', secret).update(body).digest('hex');

    expect(signature1).toBe(signature2);
  });

  it('should produce different signatures with different secrets', () => {
    const body = Buffer.from('{"type":"LOGIN"}');
    const sig1 = createHmac('sha256', 'secret-1').update(body).digest('hex');
    const sig2 = createHmac('sha256', 'secret-2').update(body).digest('hex');

    expect(sig1).not.toBe(sig2);
  });
});
