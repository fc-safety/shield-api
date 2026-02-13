import { Injectable, NotFoundException } from '@nestjs/common';
import { TagsService } from 'src/assets/tags/tags.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetClientStatusDto } from './dto/get-client-status.dto';
import { GetTagUrlDto } from './dto/get-tag-url.dto';

@Injectable()
export class M2mService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tags: TagsService,
  ) {}

  async getClientStatus(getClientStatusDto: GetClientStatusDto) {
    const { clientId, legacyUsername } = getClientStatusDto;

    let client: Prisma.ClientGetPayload<{
      select: {
        id: true;
        status: true;
      };
    }> | null = null;

    if (clientId) {
      client = await this.prisma.bypassRLS().client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          status: true,
        },
      });
    } else if (legacyUsername) {
      client = await this.prisma
        .bypassRLS()
        .person.findFirst({
          where: { legacyUsername },
          select: {
            clientAccess: {
              select: {
                client: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
              orderBy: {
                isPrimary: 'desc',
              },
              take: 1,
            },
          },
        })
        .then((person) => person?.clientAccess[0]?.client ?? null);
    }

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return client;
  }

  async getTagUrl(getTagUrlDto: GetTagUrlDto) {
    const { legacyTagId } = getTagUrlDto;

    const tag = await this.prisma.bypassRLS().tag.findFirst({
      where: { legacyTagId },
      select: {
        serialNumber: true,
        externalId: true,
        client: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found.');
    }

    const { tagUrl } = await this.tags.generateSignedUrlSingle({
      serialNumber: tag.serialNumber,
      externalId: tag.externalId,
    });

    return {
      url: tagUrl,
      clientStatus: tag.client?.status ?? null,
    };
  }
}
