import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendResetPasswordQueryDto } from './dto/send-reset-password-email-query.dto';
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

  @Post(':id/assign-role')
  @CheckPolicies(({ user }) => user.can('update', 'users'))
  assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.assignRole(id, assignRoleDto, clientId);
  }

  @Post(':id/reset-password')
  @CheckPolicies(({ user }) => user.can('update', 'users'))
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
