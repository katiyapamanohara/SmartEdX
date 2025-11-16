import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StatusDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  id?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
