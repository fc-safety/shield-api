import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckCapability, CheckScope } from 'src/auth/utils/policies';
import { RoleScope } from 'src/generated/prisma/enums';
import { AddRoleDto } from './dto/add-role.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendResetPasswordQueryDto } from './dto/send-reset-password-email-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@CheckCapability('manage-users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @CheckScope(RoleScope.GLOBAL)
  @Get('generate-password')
  generatePassword(@Query('length', ParseIntPipe) length?: number) {
    return this.usersService.generatePassword(length);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @CheckScope(RoleScope.GLOBAL)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.update(id, updateUserDto, clientId);
  }

  /**
   * Add a role to a user without removing existing roles.
   * Supports multi-role assignment.
   */
  @Post(':id/roles')
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
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.removeRole(id, { roleId }, clientId);
  }

  @CheckScope(RoleScope.GLOBAL)
  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto, clientId);
  }

  @Post(':id/send-reset-password-email')
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
