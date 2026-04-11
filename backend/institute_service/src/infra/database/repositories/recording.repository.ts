import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Recording } from '../../../modules/auth/entities/recording.entity';

@Injectable()
export class RecordingRepository extends BaseRepository<Recording> {
  constructor(
    @InjectRepository(Recording)
    private readonly repo: Repository<Recording>,
  ) {
    super(repo);
  }

  async findByInstituteId(
    instituteId: string,
    filters?: { categoryId?: string; search?: string },
  ): Promise<Recording[]> {
    const qb = this.repo
      .createQueryBuilder('recording')
      .leftJoinAndSelect('recording.category', 'category')
      .leftJoinAndSelect('recording.courseAssignments', 'assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .where('recording.instituteId = :instituteId', { instituteId })
      .orderBy('recording.createdAt', 'DESC');

    if (filters?.categoryId) {
      qb.andWhere('recording.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.search) {
      qb.andWhere('LOWER(recording.title) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  async findOneWithRelations(
    id: string,
    instituteId: string,
  ): Promise<Recording | null> {
    return this.repo.findOne({
      where: { id, instituteId },
      relations: ['category', 'courseAssignments', 'courseAssignments.course'],
    });
  }
}
