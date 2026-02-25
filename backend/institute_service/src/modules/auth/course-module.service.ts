import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseModuleRepository, CourseRepository } from '../../infra/database/repositories';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CourseModule } from './entities/course-module.entity';

@Injectable()
export class CourseModuleService {
  constructor(
    private readonly courseModuleRepository: CourseModuleRepository,
    private readonly courseRepository: CourseRepository,
  ) {}

  async createModule(instituteId: string, courseId: string, createDto: CreateCourseModuleDto): Promise<CourseModule> {
    const course = await this.courseRepository.findOne({ where: { id: courseId, instituteId } as any });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const newModule = await this.courseModuleRepository.create({
      ...createDto,
      courseId,
    });

    return newModule;
  }

  async getModulesByCourseId(instituteId: string, courseId: string): Promise<CourseModule[]> {
    const course = await this.courseRepository.findOne({ where: { id: courseId, instituteId } as any });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    return this.courseModuleRepository.findByCourseId(courseId);
  }

  async getModuleById(instituteId: string, courseId: string, moduleId: string): Promise<CourseModule> {
    const course = await this.courseRepository.findOne({ where: { id: courseId, instituteId } as any });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const module = await this.courseModuleRepository.findOne({ where: { id: moduleId, courseId } as any });
    if (!module) {
        throw new NotFoundException('Course module not found');
    }
    return module;
  }

  async updateModule(instituteId: string, courseId: string, moduleId: string, updateDto: UpdateCourseModuleDto): Promise<CourseModule> {
    const module = await this.getModuleById(instituteId, courseId, moduleId);
    
    Object.assign(module, updateDto);
    return this.courseModuleRepository.save(module);
  }

  async deleteModule(instituteId: string, courseId: string, moduleId: string): Promise<{ message: string }> {
    const module = await this.getModuleById(instituteId, courseId, moduleId);
    await this.courseModuleRepository.delete(module.id);
    return { message: 'Course module deleted successfully' };
  }
}
