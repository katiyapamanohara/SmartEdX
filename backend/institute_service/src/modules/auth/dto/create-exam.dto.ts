import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamQuestionDto {
  @ApiProperty() @IsString() @IsNotEmpty() id: string;

  @ApiPropertyOptional({ enum: ['mcq', 'essay'] })
  @IsOptional()
  @IsIn(['mcq', 'essay'])
  type?: 'mcq' | 'essay';

  @ApiProperty() @IsString() @IsNotEmpty() question: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(3) correctAnswer?: number;

  @ApiProperty() @IsNumber() @Min(1) marks: number;

  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() sampleAnswer?: string;
}

export class CreateExamDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty() @IsString() @IsNotEmpty() courseId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiProperty({ default: 60 }) @IsInt() @Min(5) durationMinutes: number;
  @ApiProperty({ default: 50 }) @IsInt() @Min(0) @Max(100) passingScore: number;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireFaceId?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireScreenShare?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableLiveFaceCheck?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoFailOnCheat?: boolean;
  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'active', 'completed'] })
  @IsOptional()
  @IsIn(['draft', 'scheduled', 'active', 'completed'])
  status?: string;
  @ApiProperty({ type: [ExamQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionDto)
  questions: ExamQuestionDto[];
}
