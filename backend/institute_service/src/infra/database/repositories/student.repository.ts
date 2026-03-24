import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Student } from '../../../modules/auth/entities/student.entity';

@Injectable()
export class StudentRepository extends BaseRepository<Student> {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {
    super(studentRepository);
  }

  async findByInstituteId(instituteId: string): Promise<Student[]> {
    return this.studentRepository.find({
      where: { instituteId },
      relations: ['user', 'user.role', 'courses'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { userId },
      relations: ['user', 'user.role', 'courses'],
    });
  }
}
