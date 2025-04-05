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
  assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.assignRole(id, assignRoleDto, clientId);
  }
}
