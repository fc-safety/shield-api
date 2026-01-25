import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { ClsService } from 'nestjs-cls';
import { CommonClsStore } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientAccessDto } from './dto/create-client-access.dto';
import { UpdateClientAccessDto } from './dto/update-client-access.dto';

@Injectable()
export class ClientAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService<CommonClsStore>,
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

  /**
   * Get all client access entries for a specific person (admin only).
   */
  async getPersonClientAccess(personId: string) {
    const accesses = await this.prisma.bypassRLS().personClientAccess.findMany({
      where: { personId },
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

  /**
   * Grant client access to a person (admin only).
   */
  async grantClientAccess(personId: string, dto: CreateClientAccessDto) {
    const prisma = this.prisma.bypassRLS();

    // Validate person exists
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });
    if (!person) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Validate site exists and belongs to client
    const site = await prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }
    if (site.clientId !== dto.clientId) {
      throw new BadRequestException(
        `Site ${dto.siteId} does not belong to client ${dto.clientId}`,
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
    }

    // Check if access already exists
    const existingAccess = await prisma.personClientAccess.findUnique({
      where: {
        personId_clientId: {
          personId,
          clientId: dto.clientId,
        },
      },
    });
    if (existingAccess) {
      throw new BadRequestException(
        `Person already has access to client ${dto.clientId}. Use PATCH to update.`,
      );
    }

    // Create access
    const access = await prisma.personClientAccess.create({
      data: {
        personId,
        clientId: dto.clientId,
        siteId: dto.siteId,
        roleId: dto.roleId,
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
    });

    // Invalidate cache (if person has idpId)
    if (person.idpId && client.externalId) {
      await this.invalidateCacheForPerson(person.idpId, client.externalId);
    }

    return access;
  }

  /**
   * Update client access entry (admin only).
   */
  async updateClientAccess(id: string, dto: UpdateClientAccessDto) {
    const prisma = this.prisma.bypassRLS();

    // Get existing access
    const existingAccess = await prisma.personClientAccess.findUnique({
      where: { id },
      include: {
        person: { select: { idpId: true } },
        client: { select: { externalId: true } },
      },
    });
    if (!existingAccess) {
      throw new NotFoundException(`Client access with ID ${id} not found`);
    }

    // Validate site if provided
    if (dto.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) {
        throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
      }
      if (site.clientId !== existingAccess.clientId) {
        throw new BadRequestException(
          `Site ${dto.siteId} does not belong to the client`,
        );
      }
    }

    // Validate role if provided
    if (dto.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }
    }

    // Update access
    const access = await prisma.personClientAccess.update({
      where: { id },
      data: dto,
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
    });

    // Invalidate cache (if person has idpId)
    if (existingAccess.person.idpId && existingAccess.client.externalId) {
      await this.invalidateCacheForPerson(
        existingAccess.person.idpId,
        existingAccess.client.externalId,
      );
    }

    return access;
  }

  /**
   * Revoke client access (admin only).
   */
  async revokeClientAccess(id: string) {
    const prisma = this.prisma.bypassRLS();

    // Get existing access for cache invalidation
    const existingAccess = await prisma.personClientAccess.findUnique({
      where: { id },
      include: {
        person: { select: { idpId: true } },
        client: { select: { externalId: true } },
      },
    });
    if (!existingAccess) {
      throw new NotFoundException(`Client access with ID ${id} not found`);
    }

    // Delete access
    await prisma.personClientAccess.delete({
      where: { id },
    });

    // Invalidate cache (if person has idpId)
    if (existingAccess.person.idpId && existingAccess.client.externalId) {
      await this.invalidateCacheForPerson(
        existingAccess.person.idpId,
        existingAccess.client.externalId,
      );
    }
  }

  /**
   * Invalidate cache for a person's client access.
   */
  private async invalidateCacheForPerson(
    idpId: string,
    clientExternalId: string,
  ) {
    const cacheKey = `client-access:${idpId}:${clientExternalId}`;
    await this.cache.del(cacheKey);
  }
}
