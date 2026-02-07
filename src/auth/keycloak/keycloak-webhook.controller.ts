import type { RawBodyRequest } from '@nestjs/common';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from '../guards/auth.guard';
import type {
  KeycloakEvent,
  KeycloakUserRepresentation,
} from './dto/keycloak-event.dto';
import { KeycloakService } from './keycloak.service';

@Controller('keycloak-webhook')
export class KeycloakWebhookController {
  private readonly logger = new Logger(KeycloakWebhookController.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleEvent(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-keycloak-signature') signature: string,
    @Body() event: KeycloakEvent,
  ) {
    if (
      !this.keycloakService.verifyWebhookSignature(
        req.rawBody ?? Buffer.from(''),
        signature ?? '',
      )
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Received Keycloak event: ${event.type}`);
    this.logger.debug('Event payload:', JSON.stringify(event, null, 2));

    // Handle user events
    if (
      event.type === 'admin.USER-CREATE' ||
      event.type === 'admin.USER-UPDATE'
    ) {
      await this.handleUserEvent(event);
    }

    return { received: true };
  }

  /**
   * Handle user create/update events from Keycloak.
   * Syncs user data to the Person table, particularly setting the idpId.
   */
  private async handleUserEvent(event: KeycloakEvent) {
    if (!event.representation || !event.resourceId) {
      this.logger.warn('User event missing representation or resourceId');
      return;
    }

    let representation: KeycloakUserRepresentation;
    try {
      representation = JSON.parse(event.representation);
    } catch (e) {
      this.logger.error('Failed to parse user representation', e);
      return;
    }

    const userId = representation.attributes?.user_id?.[0];
    if (!userId) {
      this.logger.warn('User representation missing user_id attribute');
      return;
    }

    const keycloakUserId = event.resourceId;

    const prisma = this.prisma.bypassRLS();

    // Check if person exists
    const existingPerson = await prisma.person.findUnique({
      where: { id: userId },
    });

    if (!existingPerson) {
      this.logger.warn(`Person ${userId} not found, skipping sync`);
      return;
    }

    // Build update data from representation
    const updateData: {
      idpId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      phoneNumber?: string;
      position?: string;
      active?: boolean;
    } = {
      idpId: keycloakUserId,
    };

    if (representation.firstName) {
      updateData.firstName = representation.firstName;
    }
    if (representation.lastName) {
      updateData.lastName = representation.lastName;
    }
    if (representation.email) {
      updateData.email = representation.email;
    }
    if (representation.username) {
      updateData.username = representation.username;
    }
    if (representation.attributes?.phone_number?.[0]) {
      updateData.phoneNumber = representation.attributes.phone_number[0];
    }
    if (representation.attributes?.user_position?.[0]) {
      updateData.position = representation.attributes.user_position[0];
    }
    if (typeof representation.enabled === 'boolean') {
      updateData.active = representation.enabled;
    }

    await prisma.person.update({
      where: { id: userId },
      data: updateData,
    });

    this.logger.log(
      `Synced Person ${userId} with Keycloak user ${keycloakUserId}`,
    );
  }
}
