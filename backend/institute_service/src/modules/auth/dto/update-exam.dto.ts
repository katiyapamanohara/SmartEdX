import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateExamDto } from './create-exam.dto';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'active', 'completed'] })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'scheduled', 'active', 'completed'])
  status?: string;
}
