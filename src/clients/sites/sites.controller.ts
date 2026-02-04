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
import { CheckCapability, CheckScope } from 'src/auth/policies.guard';
import { CreateSiteDto } from './dto/create-site.dto';
import { QuerySiteDto } from './dto/query-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
@CheckScope('CLIENT')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @CheckCapability('manage-users')
  create(@Body() createSiteDto: CreateSiteDto) {
    return this.sitesService.create(createSiteDto);
  }

  @Get()
  findAll(@Query() querySiteDto: QuerySiteDto) {
    return this.sitesService.findAll(querySiteDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Patch(':id')
  @CheckCapability('manage-users')
  update(@Param('id') id: string, @Body() updateSiteDto: UpdateSiteDto) {
    return this.sitesService.update(id, updateSiteDto);
  }

  @Delete(':id')
  @CheckCapability('manage-users')
  remove(@Param('id') id: string) {
    return this.sitesService.remove(id);
  }
}
