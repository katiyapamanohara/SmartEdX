import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Computer Science' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CS101' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Basic concepts of programming' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-A' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ example: 'uuid-of-teacher' })
  @IsString()
  @IsOptional()
  assignedTeacherId?: string;
}
