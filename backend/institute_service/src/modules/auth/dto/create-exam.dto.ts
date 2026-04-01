import { Type } from 'class-transformer';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsDateString,
  IsArray, ValidateNested, IsNumber, Min, Max, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamQuestionDto {
  @ApiProperty() @IsString() @IsNotEmpty() id: string;
  @ApiProperty() @IsString() @IsNotEmpty() question: string;
  @ApiProperty({ type: [String], minItems: 4, maxItems: 4 })
  @IsArray() @ArrayMinSize(4) options: [string, string, string, string];
  @ApiProperty() @IsInt() @Min(0) @Max(3) correctAnswer: number;
  @ApiProperty() @IsNumber() @Min(1) marks: number;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
}

export class CreateExamDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty() @IsString() @IsNotEmpty() courseId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiProperty({ default: 60 }) @IsInt() @Min(5) durationMinutes: number;
  @ApiProperty({ default: 50 }) @IsInt() @Min(0) @Max(100) passingScore: number;
  @ApiProperty({ type: [ExamQuestionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ExamQuestionDto)
  questions: ExamQuestionDto[];
}
