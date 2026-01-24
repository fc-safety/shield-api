import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateNotificationGroupMappingDto } from './dto/update-notification-group-mapping.dto';
import { UpdatePermissionMappingDto } from './dto/update-permission-mapping.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@CheckPolicies(({ user }) => user.isSuperAdmin())
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  @CheckPolicies(
    ({ user }) => user.can('create', 'users') || user.can('update', 'users'),
  )
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Get('permissions')
  async getPermissions() {
    return this.rolesService.getPermissions();
  }

  @Get('notification-groups')
  getNotificationGroups() {
    return this.rolesService.getNotificationGroups();
  }

  @Get(':id')
  @CheckPolicies(
    ({ user }) => user.can('create', 'users') || user.can('update', 'users'),
  )
  async getRole(@Param('id') id: string) {
    return this.rolesService.getRole(id);
  }

  @Patch(':id')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @Post(':id/update-permissions')
  @HttpCode(204)
  async assignPermissionsToRole(
    @Param('id') id: string,
    @Body() updatePermissionMappingDto: UpdatePermissionMappingDto,
  ) {
    return this.rolesService.updatePermissionToRoleMappings(
      id,
      updatePermissionMappingDto,
    );
  }

  @Post(':id/update-notification-groups')
  @HttpCode(204)
  async assignNotificationGroups(
    @Param('id') id: string,
    @Body()
    updateNotificationGroupMappingDto: UpdateNotificationGroupMappingDto,
  ) {
    return this.rolesService.updateNotificationGroups(
      id,
      updateNotificationGroupMappingDto,
    );
  }
}
