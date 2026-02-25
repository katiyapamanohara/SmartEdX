import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from '../../../modules/auth/entities/course-module.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class CourseModuleRepository extends BaseRepository<CourseModule> {
  constructor(
    @InjectRepository(CourseModule)
    repository: Repository<CourseModule>,
  ) {
    super(repository);
  }

  async findByCourseId(courseId: string): Promise<CourseModule[]> {
    return this.repository.find({
      where: { courseId } as any,
      order: { order: 'ASC' } as any,
    });
  }
}
