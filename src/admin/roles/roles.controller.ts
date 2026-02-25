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
import { CheckCapability, CheckSystemAdmin } from 'src/auth/policies.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateNotificationGroupMappingDto } from './dto/update-notification-group-mapping.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@CheckSystemAdmin()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  @CheckCapability('manage-users')
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Get('capabilities')
  @CheckCapability('manage-users')
  getCapabilities() {
    return this.rolesService.getCapabilities();
  }

  @Get('scopes')
  @CheckCapability('manage-users')
  getScopes() {
    return this.rolesService.getScopes();
  }

  @Get('notification-groups')
  getNotificationGroups() {
    return this.rolesService.getNotificationGroups();
  }

  @Get(':id')
  @CheckCapability('manage-users')
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

  @Post(':id/update-notification-groups')
  @HttpCode(204)
  async assignNotificationGroups(
    @Param('id') id: string,
    @Body()
    updateNotificationGroupMappingDto: UpdateNotificationGroupMappingDto,
  ) {
    return this.rolesService.updateNotificationGroups(
      id,
      updateNotificationGroupMappingDto.notificationGroupIds,
    );
  }
}
