import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { AddRoleDto } from './dto/add-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendResetPasswordQueryDto } from './dto/send-reset-password-email-query.dto';
import { SetRolesDto } from './dto/set-roles.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@CheckResourcePermissions('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.create(createUserDto, clientId);
  }

  @Get()
  findAll(
    @Query() queryUserDto: QueryUserDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.findAll(queryUserDto, clientId);
  }

  @Get('generate-password')
  generatePassword(@Query('length', ParseIntPipe) length?: number) {
    return this.usersService.generatePassword(length);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('clientId') clientId?: string) {
    return this.usersService.findOne(id, clientId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.update(id, updateUserDto, clientId);
  }

  /**
   * @deprecated Use PUT /users/:id/roles or POST /users/:id/roles instead
   */
  @Post(':id/assign-role')
  @CheckPolicies(({ user }) => user.canUpdate('users'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Query('clientId') clientId?: string,
  ) {
    await this.usersService.assignRole(id, assignRoleDto, clientId);
  }

  /**
   * Add a role to a user without removing existing roles.
   * Supports multi-role assignment.
   */
  @Post(':id/roles')
  @CheckPolicies(({ user }) => user.canUpdate('users'))
  async addRole(
    @Param('id') id: string,
    @Body() addRoleDto: AddRoleDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.addRole(id, addRoleDto, clientId);
  }

  /**
   * Remove a specific role from a user.
   * Other roles remain intact.
   */
  @Delete(':id/roles/:roleId')
  @CheckPolicies(({ user }) => user.canUpdate('users'))
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.removeRole(id, { roleId }, clientId);
  }

  /**
   * Set the exact set of roles for a user.
   * Removes all existing roles and assigns the specified ones.
   */
  @Put(':id/roles')
  @CheckPolicies(({ user }) => user.canUpdate('users'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async setRoles(
    @Param('id') id: string,
    @Body() setRolesDto: SetRolesDto,
    @Query('clientId') clientId?: string,
  ) {
    await this.usersService.setRoles(id, setRolesDto, clientId);
  }

  @Post(':id/reset-password')
  @CheckPolicies(({ user }) => user.canUpdate('users'))
  resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto, clientId);
  }

  @Post(':id/send-reset-password-email')
  @CheckPolicies(({ user }) => user.can('notify', 'users'))
  sendResetPasswordEmail(
    @Param('id') id: string,
    @Query() query: SendResetPasswordQueryDto,
  ) {
    return this.usersService.sendResetPasswordEmail(
      id,
      query.appClientId,
      query.clientId,
    );
  }
}
