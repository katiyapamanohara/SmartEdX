import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateInstituteDto } from './create-institute.dto';

import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateInstituteDto extends PartialType(CreateInstituteDto) {
  @ApiProperty({ example: true, description: 'Is institute active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
