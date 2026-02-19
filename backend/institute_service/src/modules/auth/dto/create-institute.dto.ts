import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstituteDto {
  @ApiProperty({ example: 'My Institute', description: 'Name of the institute' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A brief description', description: 'Institute description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'New York', description: 'Institute location', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'education', description: 'Institute category', required: true })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'gpt-4', description: 'Default AI model', required: false })
  @IsString()
  @IsOptional()
  defaultModel?: string;

  @ApiProperty({ example: 'data:image/png;base64,...', description: 'Institute logo (base64)', required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ example: '100-500', description: 'Number of students', required: false })
  @IsString()
  @IsOptional()
  studentCount?: string;

  @ApiProperty({ example: 'Google Search', description: 'How they found us', required: false })
  @IsString()
  @IsOptional()
  referralSource?: string;

  @ApiProperty({ example: 'United States', description: 'Institute country', required: true })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '+1234567890', description: 'Institute phone number', required: true })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber: string;

  @ApiProperty({ example: '["Customer Support", "Tutoring"]', description: 'Primary use cases', required: false })
  @IsString()
  @IsOptional()
  primaryUseCases?: string;
}
