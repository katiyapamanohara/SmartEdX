import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseRepository, TeacherRepository } from '../../infra/database/repositories';


import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Teacher } from './entities/teacher.entity';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly teacherRepository: TeacherRepository,
  ) {}

  async createCourse(instituteId: string, createDto: CreateCourseDto) {
    const { assignedTeacherId, ...courseData } = createDto;
    
    let teachers: Teacher[] = [];
    if (assignedTeacherId) {
      const teacher = await this.teacherRepository.findById(assignedTeacherId);
      if (teacher) {
        teachers = [teacher];
      }
    }

    return this.courseRepository.create({
      ...courseData,
      instituteId,
      teachers,
    });
  }

  async getCourses(instituteId: string) {
    return this.courseRepository.findByInstituteId(instituteId);
  }

  async getCourseById(instituteId: string, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.instituteId !== instituteId) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async updateCourse(instituteId: string, courseId: string, updateDto: UpdateCourseDto) {
    const course = await this.getCourseById(instituteId, courseId);
    Object.assign(course, updateDto);
    return this.courseRepository.save(course);
  }

  async deleteCourse(instituteId: string, courseId: string) {
    const course = await this.getCourseById(instituteId, courseId);
    await this.courseRepository.delete(course.id);
    return { message: 'Course deleted successfully' };
  }
}
