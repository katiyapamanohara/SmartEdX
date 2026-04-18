import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { InstituteUser } from '../../../modules/auth/entities/institute-user.entity';

@Injectable()
export class InstituteUserRepository extends BaseRepository<InstituteUser> {
  constructor(
    @InjectRepository(InstituteUser)
    private readonly instituteUserRepository: Repository<InstituteUser>,
  ) {
    super(instituteUserRepository);
  }

  async findByInstituteId(instituteId: string): Promise<InstituteUser[]> {
    return this.instituteUserRepository.find({
      where: { instituteId },
      relations: ['role'],
    });
  }

  async findByEmail(email: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { email },
      relations: ['role', 'institute'],
    });
  }

  async findById(id: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { id },
      relations: ['role', 'institute'],
    });
  }

  async countStudentsByInstituteIds(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const rows = await this.instituteUserRepository
      .createQueryBuilder('iu')
      .innerJoin('iu.role', 'r')
      .select('iu.instituteId', 'instituteId')
      .addSelect('COUNT(*)', 'count')
      .where('iu.instituteId IN (:...ids)', { ids })
      .andWhere('r.name = :role', { role: 'student' })
      .groupBy('iu.instituteId')
      .getRawMany<{ instituteId: string; count: string }>();

    return Object.fromEntries(rows.map((r) => [r.instituteId, parseInt(r.count, 10)]));
  }
}
