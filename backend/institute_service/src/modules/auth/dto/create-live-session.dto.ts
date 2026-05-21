import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateLiveSessionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
