import { IsString, IsNotEmpty, IsOptional, IsUrl, IsEnum, IsNumber } from 'class-validator';
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

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  quizData?: any;

  @IsNumber()
  @IsOptional()
  order?: number;
}
