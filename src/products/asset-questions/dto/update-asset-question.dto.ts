import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetQuestionDto } from './create-asset-question.dto';

export class UpdateAssetQuestionDto extends PartialType(
  CreateAssetQuestionDto,
) {}
