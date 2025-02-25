import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CheckResourcePermissions } from 'src/auth/policies.guard';
import { getViewContext } from 'src/common/utils';
import { CreateTagDto } from './dto/create-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
@CheckResourcePermissions('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll(@Query() queryTagDto: QueryTagDto, @Req() req: Request) {
    const context = getViewContext(req);
    return this.tagsService.findAll(queryTagDto, context);
  }

  @Get('externalId/:externalId')
  findOneByExternalId(
    @Param('externalId') externalId: string,
    @Req() req: Request,
  ) {
    const context = getViewContext(req);
    return this.tagsService.findOneByExternalId(externalId, context);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const context = getViewContext(req);
    return this.tagsService.findOne(id, context);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
