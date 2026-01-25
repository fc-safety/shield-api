import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { DbRolesService } from './db-roles.service';
import { AddPermissionsDto } from './dto/add-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('db-roles')
@CheckPolicies(({ user }) => user.isSuperAdmin())
export class DbRolesController {
  constructor(private readonly dbRolesService: DbRolesService) {}

  /**
   * List all roles, optionally filtered by clientId.
   */
  @Get()
  async listRoles(@Query('clientId') clientId?: string) {
    return this.dbRolesService.listRoles(clientId);
  }

  /**
   * Get a single role by ID.
   */
  @Get(':id')
  async getRole(@Param('id') id: string) {
    return this.dbRolesService.getRole(id);
  }

  /**
   * Create a new role.
   */
  @Post()
  async createRole(@Body() dto: CreateRoleDto) {
    return this.dbRolesService.createRole(dto);
  }

  /**
   * Update a role.
   */
  @Patch(':id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.dbRolesService.updateRole(id, dto);
  }

  /**
   * Delete a role.
   */
  @Delete(':id')
  @HttpCode(204)
  async deleteRole(@Param('id') id: string) {
    return this.dbRolesService.deleteRole(id);
  }

  /**
   * Add permissions to a role.
   */
  @Post(':id/permissions')
  async addPermissions(
    @Param('id') id: string,
    @Body() dto: AddPermissionsDto,
  ) {
    return this.dbRolesService.addPermissions(id, dto);
  }

  /**
   * Remove a permission from a role.
   */
  @Delete(':id/permissions/:permission')
  @HttpCode(204)
  async removePermission(
    @Param('id') id: string,
    @Param('permission') permission: string,
  ) {
    return this.dbRolesService.removePermission(id, permission);
  }
}
