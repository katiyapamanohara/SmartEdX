import { PartialType } from '@nestjs/swagger';
import { CreateModuleContentDto } from './create-module-content.dto';

export class UpdateModuleContentDto extends PartialType(
  CreateModuleContentDto,
) {}
