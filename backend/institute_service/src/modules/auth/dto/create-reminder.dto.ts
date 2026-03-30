import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty({ example: 'Grade assignments' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have 5 assignments pending review.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: '2026-04-01T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
