import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecordingCategoryDto {
  @ApiProperty({ example: 'Lecture' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}
