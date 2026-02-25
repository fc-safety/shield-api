import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CheckCapability, CheckScope } from 'src/auth/policies.guard';
import { AddRoleDto } from './dto/add-role.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { MembersService } from './members.service';

@Controller('members')
@CheckScope('CLIENT')
@CheckCapability('manage-users')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@Query() query: QueryMemberDto) {
    return this.membersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post('invite')
  invite(@Body() dto: InviteMemberDto) {
    return this.membersService.invite(dto);
  }

  @Post(':id/reset-password-email')
  sendResetPasswordEmail(
    @Param('id') id: string,
    @Query('appClientId') appClientId: string,
  ) {
    return this.membersService.sendResetPasswordEmail(id, appClientId);
  }

  @Post(':id/roles')
  addRole(@Param('id') id: string, @Body() dto: AddRoleDto) {
    return this.membersService.addRole(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  @Delete(':id/roles')
  removeRole(@Param('id') id: string, @Body() dto: RemoveRoleDto) {
    return this.membersService.removeRole(id, dto);
  }
}
