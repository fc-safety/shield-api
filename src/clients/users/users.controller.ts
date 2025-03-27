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
import { ViewCtx } from 'src/common/decorators';
import { ViewContext } from 'src/common/utils';
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
    @ViewCtx() viewContext: ViewContext,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.create(createUserDto, clientId, viewContext);
  }

  @Get()
  findAll(
    @Query() queryUserDto: QueryUserDto,
    @ViewCtx() viewContext: ViewContext,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.findAll(queryUserDto, clientId, viewContext);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @ViewCtx() viewContext: ViewContext,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.findOne(id, clientId, viewContext);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @ViewCtx() viewContext: ViewContext,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.update(id, updateUserDto, clientId, viewContext);
  }

  @Post(':id/assign-role')
  assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @ViewCtx() viewContext: ViewContext,
    @Query('clientId') clientId?: string,
  ) {
    return this.usersService.assignRole(
      id,
      assignRoleDto,
      clientId,
      viewContext,
    );
  }
}
