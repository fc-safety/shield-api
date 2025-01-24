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
import { UpdatePermissionMappingDto } from './dto/update-permission-mapping.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@CheckPolicies(({ user }) => user.isGlobalAdmin())
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Get('permissions')
  async getPermissions() {
    return this.rolesService.getPermissions();
  }

  @Get(':id')
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
}
