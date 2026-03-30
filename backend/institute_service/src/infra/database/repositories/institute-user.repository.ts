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

  async findByEmailAndInstituteId(email: string, instituteId: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { email, instituteId },
      relations: ['role', 'institute'],
    });
  }

  async findById(id: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { id },
      relations: ['role', 'institute'],
    });
  }

  async getMonthlyStudentEnrollment(instituteId: string, year: number): Promise<number[]> {
    const rows: { month: string; count: string }[] = await this.instituteUserRepository
      .createQueryBuilder('u')
      .select('EXTRACT(MONTH FROM u.createdAt)', 'month')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('u.role', 'r')
      .where('u.instituteId = :instituteId', { instituteId })
      .andWhere('r.name = :role', { role: 'student' })
      .andWhere('EXTRACT(YEAR FROM u.createdAt) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM u.createdAt)')
      .orderBy('EXTRACT(MONTH FROM u.createdAt)', 'ASC')
      .getRawMany();

    const result = Array(12).fill(0);
    for (const row of rows) {
      result[Number(row.month) - 1] = Number(row.count);
    }
    return result;
  }
}
