import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { format } from 'date-fns';
import type { Response } from 'express';
import { CheckAnyCapability, CheckCapability } from 'src/auth/policies.guard';
import { streamToCsv, streamToNdJson } from 'src/common/stream-utils';
import { INSPECTION_TOKEN_HEADER } from '../inspections/constants/headers';
import { BulkGenerateSignedTagUrlDto } from './dto/bulk-generate-signed-tag-url.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { GenerateSignedTagUrlDto } from './dto/generate-signed-tag-url.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { RegisterTagDto } from './dto/register-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
@CheckAnyCapability('manage-assets', 'perform-inspections', 'program-tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @CheckCapability('manage-assets')
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll(@Query() queryTagDto: QueryTagDto) {
    return this.tagsService.findAll(queryTagDto);
  }

  @Get('for-inspection/:externalId')
  findOneByExternalId(@Param('externalId') externalId: string) {
    return this.tagsService.findOneForInspection(externalId);
  }

  @Get('for-asset-setup/:externalId')
  findOneForAssetSetup(@Param('externalId') externalId: string) {
    return this.tagsService.findOneForAssetSetup(externalId);
  }

  @Get('check-registration')
  checkRegistration(@Headers(INSPECTION_TOKEN_HEADER) inspectionToken: string) {
    return this.tagsService.checkRegistration(inspectionToken);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @CheckCapability('manage-assets')
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @CheckCapability('manage-assets')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }

  @HttpCode(HttpStatus.OK)
  @CheckCapability('program-tags')
  @Post('generate-signed-url')
  generateSignedUrlSingle(
    @Body() generateSignedTagUrlDto: GenerateSignedTagUrlDto,
  ) {
    return this.tagsService.generateSignedUrlSingle(generateSignedTagUrlDto);
  }

  @HttpCode(HttpStatus.OK)
  @CheckCapability('program-tags')
  @Post('bulk-generate-signed-url/json')
  async generateSignedUrlBulkJson(
    @Body() dto: BulkGenerateSignedTagUrlDto,
    @Res() res: Response,
  ) {
    const jsonStream = await this.tagsService.generateSignedUrlBulkJson(dto);
    streamToNdJson(jsonStream, res, {
      filename: `tag-data-${dto.serialNumbers?.at(0) ?? dto.serialNumberRangeStart}-${format(new Date(), 'yyyy_MM_dd_HH_mm_ss')}.ndjson`,
    });
  }

  @HttpCode(HttpStatus.OK)
  @CheckCapability('program-tags')
  @Post('bulk-generate-signed-url/csv')
  async generateSignedUrlBulkCsv(
    @Body() dto: BulkGenerateSignedTagUrlDto,
    @Res() res: Response,
  ) {
    const csvStream = await this.tagsService.generateSignedUrlBulkCsv(dto);
    streamToCsv(csvStream, res, {
      filename: `tag-data-${dto.serialNumbers?.at(0) ?? dto.serialNumberRangeStart}-${format(new Date(), 'yyyy_MM_dd_HH_mm_ss')}.csv`,
    });
  }

  @HttpCode(HttpStatus.OK)
  @CheckCapability('register-tags')
  @Post('register-tag')
  registerTag(
    @Headers(INSPECTION_TOKEN_HEADER) inspectionToken: string,
    @Body() registerTagDto: RegisterTagDto,
  ) {
    return this.tagsService.registerTag(inspectionToken, registerTagDto);
  }
}
