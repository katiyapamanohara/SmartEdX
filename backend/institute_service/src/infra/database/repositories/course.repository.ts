import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Course } from '../../../modules/auth/entities/course.entity';

@Injectable()
export class CourseRepository extends BaseRepository<Course> {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {
    super(courseRepository);
  }

  async findByInstituteId(instituteId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { instituteId },
      relations: ['teachers', 'teachers.user'],
      order: { createdAt: 'DESC' },
    });
  }
}
