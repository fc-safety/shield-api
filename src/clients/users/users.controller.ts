import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckResourcePermissions } from 'src/auth/policies.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';

@Controller('clients/:clientId/users')
@CheckResourcePermissions('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Param('clientId') clientId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(clientId, createUserDto);
  }

  @Get()
  findAll(
    @Param('clientId') clientId: string,
    @Query() queryUserDto: QueryUserDto,
  ) {
    return this.usersService.findAll(clientId, queryUserDto);
  }

  @Get(':id')
  findOne(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.usersService.findOne(clientId, id);
  }

  @Patch(':id')
  update(
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() updateUserDto: CreateUserDto,
  ) {
    return this.usersService.update(clientId, id, updateUserDto);
  }

  @Post(':id/assign-role')
  assignRole(
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(clientId, id, assignRoleDto);
  }
}
