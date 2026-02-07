import { Controller, Get, Headers, Query } from '@nestjs/common';
import { Public } from 'src/auth/guards/auth.guard';
import { CheckPublicPolicies } from 'src/auth/policies.guard';
import { firstOf } from 'src/common/utils';
import { TagsService } from '../tags/tags.service';
import { INSPECTION_TOKEN_HEADER } from './constants/headers';
import { InspectionsPublicService } from './inspections-public.service';

@Controller('inspections-public')
@CheckPublicPolicies(async ({ request, moduleRef }) => {
  const inspectionToken = firstOf(request.headers[INSPECTION_TOKEN_HEADER]);
  if (!inspectionToken) {
    return false;
  }

  const tagService = moduleRef.get(TagsService, { strict: false });

  return await tagService
    .validateInspectionToken(inspectionToken)
    .then(({ isValid }) => isValid);
})
export class InspectionsPublicController {
  constructor(
    private readonly inspectionsPublicService: InspectionsPublicService,
  ) {}

  @Public()
  @Get('is-valid-tag-url')
  isValidTagUrl(@Query('url') url: string) {
    return this.inspectionsPublicService.isValidTagUrl(url);
  }

  @Public()
  @Get('is-valid-tag-id')
  isValidTagId(@Query('id') id: string, @Query('extId') extId: string) {
    return this.inspectionsPublicService.isValidTagId({
      id,
      extId,
    });
  }

  @Get('history')
  getInspectionHistory(@Headers(INSPECTION_TOKEN_HEADER) token: string) {
    return this.inspectionsPublicService.getInspectionHistory(token);
  }

  @Public()
  @Get('validate-token')
  validateInspectionToken(@Headers(INSPECTION_TOKEN_HEADER) token: string) {
    return this.inspectionsPublicService.validateInspectionToken(token);
  }
}
