import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEnum,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '../entities/module-content.entity';

export class CreateModuleContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  // Only validate URL format when a non-empty value is actually provided
  @ValidateIf((o) => o.url !== undefined && o.url !== null && o.url !== '')
  @IsUrl()
  url?: string;

  @IsOptional()
  quizData?: any;

  @IsNumber()
  @IsOptional()
  order?: number;
}
