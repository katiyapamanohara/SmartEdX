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

  async findByBatchNumberAndInstituteId(batchNumber: string, instituteId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { batchNumber, instituteId },
    });
  }

  async findCourseWithModulesForTeacher(courseId: string, userId: string, instituteId: string): Promise<Course | null> {
    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.teachers', 'teacher', 'teacher.userId = :userId', { userId })
      .leftJoinAndSelect('course.teachers', 'allTeachers')
      .leftJoinAndSelect('allTeachers.user', 'teacherUser')
      .leftJoinAndSelect('course.modules', 'module')
      .leftJoinAndSelect('module.contents', 'content')
      .where('course.id = :courseId', { courseId })
      .andWhere('course.instituteId = :instituteId', { instituteId })
      .orderBy('module.order', 'ASC')
      .addOrderBy('content.order', 'ASC')
      .getOne();
  }

  async findCoursesWithQuizzesByTeacher(userId: string, instituteId: string): Promise<Course[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.teachers', 'teacher', 'teacher.userId = :userId', { userId })
      .leftJoinAndSelect('course.modules', 'module')
      .leftJoinAndSelect('module.contents', 'content', 'content.type = :type', { type: 'quiz' })
      .where('course.instituteId = :instituteId', { instituteId })
      .orderBy('course.createdAt', 'DESC')
      .addOrderBy('module.order', 'ASC')
      .addOrderBy('content.order', 'ASC')
      .getMany();
  }

  async findByStudentUserId(userId: string, instituteId: string): Promise<Course[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.students', 'student', 'student.userId = :userId', { userId })
      .leftJoinAndSelect('course.teachers', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('course.modules', 'module')
      .where('course.instituteId = :instituteId', { instituteId })
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  async findByTeacherUserId(userId: string, instituteId: string): Promise<Course[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.teachers', 'teacher', 'teacher.userId = :userId', { userId })
      .leftJoinAndSelect('course.teachers', 'allTeachers')
      .leftJoinAndSelect('allTeachers.user', 'teacherUser')
      .where('course.instituteId = :instituteId', { instituteId })
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }
}
