import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCourseModuleDto {
  @ApiProperty({ description: 'Title of the module' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the module', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Order of the module in the course', default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}
