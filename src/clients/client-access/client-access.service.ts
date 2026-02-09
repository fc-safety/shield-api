import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { ApiClsService } from 'src/auth/api-cls.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClientAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Get all client access entries for the current user.
   */
  async getMyClientAccess() {
    const user = this.cls.get('user');
    if (!user) {
      return [];
    }

    const accesses = await this.prisma.bypassRLS().personClientAccess.findMany({
      where: {
        person: { idpId: user.idpId },
      },
      include: {
        client: {
          select: {
            id: true,
            externalId: true,
            name: true,
          },
        },
        site: {
          select: {
            id: true,
            externalId: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdOn: 'asc',
      },
    });

    return accesses;
  }
}
