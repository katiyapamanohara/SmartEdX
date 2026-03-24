import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { RecordingCategory } from '../../../modules/auth/entities/recording-category.entity';

@Injectable()
export class RecordingCategoryRepository extends BaseRepository<RecordingCategory> {
  constructor(
    @InjectRepository(RecordingCategory)
    private readonly repo: Repository<RecordingCategory>,
  ) {
    super(repo);
  }

  async findByInstituteId(instituteId: string): Promise<RecordingCategory[]> {
    return this.repo.find({
      where: { instituteId },
      order: { name: 'ASC' },
    });
  }

  async findByNameAndInstituteId(name: string, instituteId: string): Promise<RecordingCategory | null> {
    return this.repo.findOne({ where: { name, instituteId } });
  }

  async createForInstitute(name: string, instituteId: string): Promise<RecordingCategory> {
    const existing = await this.findByNameAndInstituteId(name, instituteId);
    if (existing) throw new ConflictException(`Category "${name}" already exists`);
    return this.repo.save(this.repo.create({ name, instituteId }));
  }
}
