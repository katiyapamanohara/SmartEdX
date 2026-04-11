import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty({ example: '+11234567890', description: 'User phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    example: 'My Institute',
    description: 'Name of the institute',
  })
  @IsString()
  @IsNotEmpty()
  instituteName: string;

  @ApiProperty({ example: '1-100', description: 'Number of students' })
  @IsString()
  @IsNotEmpty()
  numberOfStudents: string;

  @ApiProperty({
    example: 'Google Search',
    description: 'How the user heard about us',
  })
  @IsString()
  @IsNotEmpty()
  hearAboutUs: string;

  @ApiProperty({
    example: '["Student Management"]',
    description: 'Primary use cases as JSON string',
  })
  @IsString()
  @IsOptional()
  primaryUseCase: string;
}
