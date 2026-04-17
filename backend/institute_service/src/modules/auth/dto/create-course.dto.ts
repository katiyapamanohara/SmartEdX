import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({ example: 49.99, description: 'Course price — omit or null for free', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number | null;

  @ApiProperty({ example: 'fixed', enum: ['fixed', 'monthly'], description: 'Payment type: one-time fixed price or recurring monthly', required: false })
  @IsIn(['fixed', 'monthly'])
  @IsOptional()
  paymentType?: 'fixed' | 'monthly';

  @ApiProperty({ example: 9.99, description: 'Monthly subscription price — used when paymentType is monthly', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  monthlyPrice?: number | null;
}
