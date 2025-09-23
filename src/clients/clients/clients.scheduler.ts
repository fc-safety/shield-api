import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UseCls } from 'nestjs-cls';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientsService } from './clients.service';

@Injectable()
export class ClientsScheduler {
  private readonly logger = new Logger(ClientsScheduler.name);

  constructor(
    private readonly clientsService: ClientsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  @UseCls({
    setup(cls) {
      cls.set('mode', 'cron');
    },
  })
  async handleDemoClientInspectionAutoRenewal() {
    const prisma = this.prisma.bypassRLS();
    const clients = await prisma.client.findMany({
      where: {
        demoMode: true,
      },
    });
    for (const client of clients) {
      const result = await this.clientsService.renewNoncompliantDemoAssets({
        clientId: client.id,
      });

      if (result) {
        this.logger.debug(
          `--> Renewed ${result.succeededAssetIds.length} assets (${result.failedAssetIds.length} failed) for client ${client.name}`,
        );
      } else {
        this.logger.debug(`--> No assets to renew for client ${client.name}`);
      }
    }
  }
}
