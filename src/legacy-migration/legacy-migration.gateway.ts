import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { z } from 'zod';
import { LegacyMigrationService } from './legacy-migration.service';
import { BaseWsException } from './utils/ws-exceptions';

@WebSocketGateway({ path: '/legacy-migration' })
@Injectable()
export class LegacyMigrationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LegacyMigrationGateway.name);

  constructor(
    private readonly legacyMigrationService: LegacyMigrationService,
  ) {}

  private readonly clientData: Map<
    WebSocket,
    {
      clientId: string;
      pendingPrompt: {
        resolve: (value: string) => void;
        reject: (reason?: any) => void;
      } | null;
    }
  > = new Map();
  private clientCounter = 0;

  async handleConnection(client: WebSocket, message: IncomingMessage) {
    // Validate the request.
    const token = this.extractTokenFromUrl(message.url);
    const { isValid, error } =
      await this.legacyMigrationService.validateWsToken(token);
    if (!isValid) {
      client.close(1008, error);
      return;
    }

    // Initalize client data in client data store.
    const clientId = `client_${this.clientCounter++}`;
    this.logger.log(`Client connected: ${clientId}`);
    this.clientData.set(client, { clientId, pendingPrompt: null });
    this.emitEvent(client, 'connected', {
      message: `Connected to NestJS WebSocket server as ${clientId}`,
    });
  }

  handleDisconnect(client: WebSocket) {
    // Clean up client data to avoid memory leaks.
    const clientData = this.clientData.get(client);
    if (clientData) {
      this.logger.log(`Client disconnected: ${clientData.clientId}`);
      clientData.pendingPrompt?.reject('Client disconnected');
    }
    this.clientData.delete(client);
  }

  @SubscribeMessage('process-migration')
  async migrate(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      await this.legacyMigrationService.processMigration({
        prompt: (message: any, options) =>
          this.initPrompt(client, message, options),
        emitEvent: (event: string, data: any) =>
          this.emitEvent(client, event, data),
      });
    } catch (error) {
      if (error instanceof BaseWsException) {
        client.close(error.code, error.message);
      } else {
        client.close(1011, 'Internal server error');
      }
    }
  }

  @SubscribeMessage('prompt-response')
  async promptResponse(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const clientData = this.clientData.get(client);
    if (clientData?.pendingPrompt) {
      clientData.pendingPrompt.resolve(data);
      this.emitEvent(client, 'prompt-response-ack', {
        message: `Response received.`,
      });
    }
  }

  private async initPrompt<
    Schema extends z.ZodSchema<any> | undefined = undefined,
  >(
    client: WebSocket,
    promptData: any,
    options: {
      schema?: Schema;
    } = {},
  ): Promise<
    Schema extends z.ZodSchema<any> ? z.infer<NonNullable<Schema>> : any
  > {
    const clientData = this.clientData.get(client);

    if (!clientData) {
      throw new Error(
        'Client data not found, likely due to an initialization error.',
      );
    }

    // Send prompt and wait for response
    const response = await new Promise<any>((resolve, reject) => {
      clientData.pendingPrompt = { resolve, reject };
      this.emitEvent(client, 'prompt', promptData);
    });

    clientData.pendingPrompt = null;

    if (options.schema) {
      let parsed = options.schema.safeParse(response);
      while (!parsed.success) {
        const response = await new Promise<any>((resolve, reject) => {
          clientData.pendingPrompt = { resolve, reject };
          this.emitEvent(client, 'prompt-validation-error', {
            error: parsed.error,
            original: promptData,
          });
        });
        parsed = options.schema.safeParse(response);
      }
      return parsed.data;
    }
    return response;
  }

  private emitEvent(client: WebSocket, event: string, data: any) {
    client.send(JSON.stringify({ event, data }));
  }

  private extractTokenFromUrl(url: string | undefined | null) {
    if (!url) {
      return null;
    }
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get('token');
  }
}
