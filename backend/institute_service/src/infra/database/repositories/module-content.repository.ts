import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleContent } from '../../../modules/auth/entities/module-content.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class ModuleContentRepository extends BaseRepository<ModuleContent> {
  constructor(
    @InjectRepository(ModuleContent)
    repository: Repository<ModuleContent>,
  ) {
    super(repository);
  }

  async findByModuleId(moduleId: string): Promise<ModuleContent[]> {
    return this.repository.find({
      where: { moduleId } as any,
      order: { order: 'ASC' } as any,
    });
  }
}
