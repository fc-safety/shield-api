import { PartialType } from '@nestjs/mapped-types';
import { CreateAnsiCategoryDto } from './create-ansi-category.dto';

export class UpdateAnsiCategoryDto extends PartialType(CreateAnsiCategoryDto) {}
