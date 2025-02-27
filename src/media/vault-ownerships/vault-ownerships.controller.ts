import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ViewCtx } from 'src/common/decorators';
import { type ViewContext } from 'src/common/utils';
import { CreateVaultOwnershipDto } from './dto/create-vault-ownership.dto';
import { QueryViewOwnershipDto } from './dto/query-view-ownership.dto';
import { UpdateVaultOwnershipDto } from './dto/update-vault-ownership.dto';
import { VaultOwnershipsService } from './vault-ownerships.service';

@Controller('vault-ownerships')
@CheckIsAuthenticated()
export class VaultOwnershipsController {
  constructor(
    private readonly vaultOwnershipsService: VaultOwnershipsService,
  ) {}

  @Post()
  create(@Body() createVaultOwnershipDto: CreateVaultOwnershipDto) {
    return this.vaultOwnershipsService.create(createVaultOwnershipDto);
  }

  @Get()
  findAll(
    @Query() queryViewOwnershipDto: QueryViewOwnershipDto,
    @ViewCtx() context: ViewContext,
  ) {
    return this.vaultOwnershipsService.findAll(queryViewOwnershipDto, context);
  }

  @Get('key/*')
  async findOneByKey(@Param() params: string[]) {
    const key = params[0];
    return this.vaultOwnershipsService.findOneByKey(key);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vaultOwnershipsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVaultOwnershipDto: UpdateVaultOwnershipDto,
  ) {
    return this.vaultOwnershipsService.update(id, updateVaultOwnershipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vaultOwnershipsService.remove(id);
  }
}
