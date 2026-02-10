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
import { CheckScope } from 'src/auth/utils/policies';
import { RoleScope } from 'src/generated/prisma/enums';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendResetPasswordQueryDto } from './dto/send-reset-password-email-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@CheckScope(RoleScope.SYSTEM)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('generate-password')
  generatePassword(@Query('length', ParseIntPipe) length?: number) {
    return this.usersService.generatePassword(length);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto);
  }

  @Post(':id/send-reset-password-email')
  sendResetPasswordEmail(
    @Param('id') id: string,
    @Query() query: SendResetPasswordQueryDto,
  ) {
    return this.usersService.sendResetPasswordEmail(id, query.appClientId);
  }
}
