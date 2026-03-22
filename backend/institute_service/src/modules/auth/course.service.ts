import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseRepository, TeacherRepository } from '../../infra/database/repositories';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Teacher } from './entities/teacher.entity';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly teacherRepository: TeacherRepository,
  ) {}

  private mapCourseToResponse(course: Course) {
    const { teachers, ...rest } = course;
    const assignedTeacher = teachers && teachers.length > 0 && teachers[0].user ? {
      id: teachers[0].userId,
      firstName: teachers[0].user.firstName,
      lastName: teachers[0].user.lastName,
      email: teachers[0].user.email,
      profilePicture: teachers[0].user.profilePicture ?? null,
    } : null;

    return {
      ...rest,
      assignedTeacher,
    };
  }

  async createCourse(instituteId: string, createDto: CreateCourseDto) {
    const { assignedTeacherId, ...courseData } = createDto;
    
    let teachers: Teacher[] = [];
    if (assignedTeacherId) {
      const teacher = await this.teacherRepository.findOne({
        where: { userId: assignedTeacherId } as any,
        relations: ['user']
      });
      if (teacher) {
        teachers = [teacher];
      }
    }

    const savedCourse = await this.courseRepository.create({
      ...courseData,
      instituteId,
      teachers,
    });

    return this.mapCourseToResponse(savedCourse);
  }

  async getCourses(instituteId: string) {
    const courses = await this.courseRepository.findByInstituteId(instituteId);
    return courses.map(course => this.mapCourseToResponse(course));
  }

  async getCourseById(instituteId: string, courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
      relations: ['teachers', 'teachers.user']
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async updateCourse(instituteId: string, courseId: string, updateDto: UpdateCourseDto) {
    const course = await this.getCourseById(instituteId, courseId);
    
    const { assignedTeacherId, ...courseData } = updateDto;
    Object.assign(course, courseData);

    if (assignedTeacherId !== undefined) {
      if (assignedTeacherId) {
        const teacher = await this.teacherRepository.findOne({
          where: { userId: assignedTeacherId } as any,
          relations: ['user']
        });
        course.teachers = teacher ? [teacher] : [];
      } else {
        course.teachers = [];
      }
    }

    const savedCourse = await this.courseRepository.save(course);
    return this.mapCourseToResponse(savedCourse);
  }

  async deleteCourse(instituteId: string, courseId: string) {
    const course = await this.getCourseById(instituteId, courseId);
    await this.courseRepository.delete(course.id);
    return { message: 'Course deleted successfully' };
  }
}
