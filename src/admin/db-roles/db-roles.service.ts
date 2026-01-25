import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddPermissionsDto } from './dto/add-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class DbRolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all roles, optionally filtered by clientId.
   */
  async listRoles(clientId?: string) {
    const prisma = this.prisma.bypassRLS();

    const where = clientId ? { clientId } : {};

    return prisma.role.findMany({
      where,
      include: {
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
        _count: {
          select: {
            personClientAccess: true,
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single role by ID with its permissions.
   */
  async getRole(id: string) {
    const prisma = this.prisma.bypassRLS();

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
        client: {
          select: {
            id: true,
            externalId: true,
            name: true,
          },
        },
        _count: {
          select: {
            personClientAccess: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Create a new role.
   */
  async createRole(dto: CreateRoleDto) {
    const prisma = this.prisma.bypassRLS();

    // Validate client exists if clientId provided
    if (dto.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client) {
        throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
      }
    }

    // Check for duplicate name within same client scope
    const existingRole = await prisma.role.findFirst({
      where: {
        name: dto.name,
        clientId: dto.clientId ?? null,
      },
    });
    if (existingRole) {
      throw new BadRequestException(
        `Role with name "${dto.name}" already exists${dto.clientId ? ' for this client' : ''}`,
      );
    }

    return prisma.role.create({
      data: dto,
      include: {
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Update a role.
   */
  async updateRole(id: string, dto: UpdateRoleDto) {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== existingRole.name) {
      const duplicateRole = await prisma.role.findFirst({
        where: {
          name: dto.name,
          clientId: existingRole.clientId,
          id: { not: id },
        },
      });
      if (duplicateRole) {
        throw new BadRequestException(
          `Role with name "${dto.name}" already exists`,
        );
      }
    }

    return prisma.role.update({
      where: { id },
      data: dto,
      include: {
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Delete a role.
   */
  async deleteRole(id: string) {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            personClientAccess: true,
          },
        },
      },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (existingRole.isSystem) {
      throw new BadRequestException('Cannot delete a system role');
    }

    if (existingRole._count.personClientAccess > 0) {
      throw new BadRequestException(
        `Cannot delete role that is assigned to ${existingRole._count.personClientAccess} person(s). Remove assignments first.`,
      );
    }

    await prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Add permissions to a role.
   */
  async addPermissions(id: string, dto: AddPermissionsDto) {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Get existing permissions to avoid duplicates
    const existingPermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permission: true },
    });
    const existingPermissionSet = new Set(
      existingPermissions.map((p) => p.permission),
    );

    // Filter out duplicates
    const newPermissions = dto.permissions.filter(
      (p) => !existingPermissionSet.has(p),
    );

    if (newPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: newPermissions.map((permission) => ({
          roleId: id,
          permission,
        })),
      });
    }

    // Return updated role
    return this.getRole(id);
  }

  /**
   * Remove a permission from a role.
   */
  async removePermission(roleId: string, permission: string) {
    const prisma = this.prisma.bypassRLS();

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const existingPermission = await prisma.rolePermission.findFirst({
      where: {
        roleId,
        permission,
      },
    });

    if (!existingPermission) {
      throw new NotFoundException(
        `Permission "${permission}" not found on role`,
      );
    }

    await prisma.rolePermission.delete({
      where: { id: existingPermission.id },
    });
  }
}
