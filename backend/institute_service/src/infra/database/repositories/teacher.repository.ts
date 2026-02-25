import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Teacher } from '../../../modules/auth/entities/teacher.entity';

@Injectable()
export class TeacherRepository extends BaseRepository<Teacher> {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {
    super(teacherRepository);
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    return this.findOne({ where: { user: { id: userId } } as any });
  }

  async findByInstituteId(instituteId: string): Promise<Teacher[]> {
    return this.teacherRepository.find({ where: { instituteId } });
  }

  async countByInstituteId(instituteId: string): Promise<number> {
    return this.teacherRepository.count({ where: { instituteId } });
  }
}
