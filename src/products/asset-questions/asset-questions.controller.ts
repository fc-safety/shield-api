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
import {
  CheckPolicies,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { AssetQuestionsService } from './asset-questions.service';
import { CreateAssetQuestionConditionDto } from './dto/create-asset-question-condition.dto';
import { CreateAssetQuestionDto } from './dto/create-asset-question.dto';
import { CreateClientAssetQuestionCustomizationDto } from './dto/create-client-asset-question-customization.dto';
import { QueryAssetQuestionDto } from './dto/query-asset-question.dto';
import { QueryQuestionsByAssetPropertiesDto } from './dto/query-questions-by-asset-properties.dto';
import { QueryQuestionsByAssetDto } from './dto/query-questions-by-asset.dto';
import { UpdateAssetQuestionConditionDto } from './dto/update-asset-question-condition.dto';
import { UpdateAssetQuestionDto } from './dto/update-asset-question.dto';
import { UpdateClientAssetQuestionCustomizationDto } from './dto/update-client-asset-question-customization.dto';

@Controller('asset-questions')
@CheckResourcePermissions('asset-questions')
export class AssetQuestionsController {
  constructor(private readonly assetQuestionsService: AssetQuestionsService) {}

  @Get('region-options/states')
  getStateOptions() {
    return this.assetQuestionsService.getStateOptions();
  }

  // CLIENT CUSTOMIZATIONS
  @Get('customizations')
  findCustomizations() {
    return this.assetQuestionsService.findClientCustomizations();
  }

  @Post('customizations')
  addCustomization(
    @Body()
    createClientAssetQuestionCustomizationDto: CreateClientAssetQuestionCustomizationDto,
  ) {
    return this.assetQuestionsService.addClientCustomization(
      createClientAssetQuestionCustomizationDto,
    );
  }

  @Patch('customizations/:customizationId')
  updateCustomization(
    @Param('customizationId') customizationId: string,
    @Body()
    updateClientAssetQuestionCustomizationDto: UpdateClientAssetQuestionCustomizationDto,
  ) {
    return this.assetQuestionsService.updateClientCustomization(
      customizationId,
      updateClientAssetQuestionCustomizationDto,
    );
  }

  @Delete('customizations/:customizationId')
  removeCustomization(@Param('customizationId') customizationId: string) {
    return this.assetQuestionsService.removeClientCustomization(
      customizationId,
    );
  }

  // ASSET-SPECIFIC ENDPOINTS

  @Get('by-asset/:assetId')
  @CheckPolicies(
    ({ user }) => user.canRead('assets') || user.canCreate('inspections'),
  )
  findByAssetId(
    @Param('assetId') assetId: string,
    @Query() query: QueryQuestionsByAssetDto,
  ) {
    return this.assetQuestionsService.findByAssetId(assetId, query.type);
  }

  @Get('by-asset-properties')
  @CheckPolicies(({ user }) => user.canRead('assets'))
  findByPartialAsset(@Query() query: QueryQuestionsByAssetPropertiesDto) {
    return this.assetQuestionsService.findByAssetProperties(query);
  }

  @Get('check-configuration-by-asset/:assetId')
  @CheckPolicies(
    ({ user }) => user.canRead('assets') || user.canCreate('inspections'),
  )
  checkConfigurationByAsset(@Param('assetId') assetId: string) {
    return this.assetQuestionsService.checkAssetConfiguration(assetId);
  }

  @Post()
  create(@Body() createAssetQuestionDto: CreateAssetQuestionDto) {
    return this.assetQuestionsService.create(createAssetQuestionDto);
  }

  @Get()
  findAll(@Query() queryAssetQuestionDto?: QueryAssetQuestionDto) {
    return this.assetQuestionsService.findAll(queryAssetQuestionDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetQuestionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssetQuestionDto: UpdateAssetQuestionDto,
  ) {
    return this.assetQuestionsService.update(id, updateAssetQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetQuestionsService.remove(id);
  }

  // VARIANTS

  @Post(':id/variants')
  addVariant(
    @Param('id') id: string,
    @Body() createAssetQuestionDto: CreateAssetQuestionDto,
  ) {
    return this.assetQuestionsService.addVariant(id, createAssetQuestionDto);
  }

  // CONDITIONS

  @Post(':id/conditions')
  addCondition(
    @Param('id') id: string,
    @Body() createAssetQuestionConditionDto: CreateAssetQuestionConditionDto,
  ) {
    return this.assetQuestionsService.addCondition(
      id,
      createAssetQuestionConditionDto,
    );
  }

  @Patch('conditions/:conditionId')
  updateCondition(
    @Param('conditionId') conditionId: string,
    @Body() updateAssetQuestionConditionDto: UpdateAssetQuestionConditionDto,
  ) {
    return this.assetQuestionsService.updateCondition(
      conditionId,
      updateAssetQuestionConditionDto,
    );
  }

  @Delete('conditions/:conditionId')
  removeCondition(@Param('conditionId') conditionId: string) {
    return this.assetQuestionsService.removeCondition(conditionId);
  }

  @Post('migrate-to-conditions')
  @CheckPolicies(({ user }) => user.isSuperAdmin())
  migrateQuestionsToConditions() {
    return this.assetQuestionsService.migrateQuestionsToConditions();
  }
}
