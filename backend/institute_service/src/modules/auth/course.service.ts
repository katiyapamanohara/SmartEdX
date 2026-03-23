import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CourseRepository, TeacherRepository } from '../../infra/database/repositories';
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { CourseModuleRepository } from '../../infra/database/repositories/course-module.repository';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Teacher } from './entities/teacher.entity';
import { Course } from './entities/course.entity';
import { ContentType } from './entities/module-content.entity';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly moduleContentRepository: ModuleContentRepository,
    private readonly courseModuleRepository: CourseModuleRepository,
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

  // ─── Shared teacher ownership check ───────────────────────────
  private async _assertTeacherOwns(courseId: string, instituteId: string, userId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
      relations: ['teachers'],
    });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.teachers?.some((t) => t.userId === userId)) {
      throw new ForbiddenException('You are not assigned to this course');
    }
    return course;
  }

  // ─── Teacher module CRUD ────────────────────────────────────────
  async createModuleForTeacher(instituteId: string, courseId: string, userId: string, dto: { title: string; description?: string; order?: number }) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const existing = await this.courseModuleRepository.findByCourseId(courseId);
    return this.courseModuleRepository.create({
      ...dto,
      courseId,
      order: dto.order ?? existing.length,
    });
  }

  async updateModuleForTeacher(instituteId: string, courseId: string, moduleId: string, userId: string, dto: { title?: string; description?: string; order?: number }) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const module = await this.courseModuleRepository.findOne({ where: { id: moduleId, courseId } as any });
    if (!module) throw new NotFoundException('Module not found');
    Object.assign(module, dto);
    return this.courseModuleRepository.save(module);
  }

  async deleteModuleForTeacher(instituteId: string, courseId: string, moduleId: string, userId: string) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const module = await this.courseModuleRepository.findOne({ where: { id: moduleId, courseId } as any });
    if (!module) throw new NotFoundException('Module not found');
    await this.courseModuleRepository.delete(module.id);
    return { message: 'Module deleted successfully' };
  }

  // ─── Teacher content CRUD ───────────────────────────────────────
  async createContentForTeacher(instituteId: string, courseId: string, moduleId: string, userId: string, dto: { title: string; description?: string; type: ContentType; url?: string; quizData?: any; order?: number }) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const module = await this.courseModuleRepository.findOne({ where: { id: moduleId, courseId } as any });
    if (!module) throw new NotFoundException('Module not found');
    const existing = await this.moduleContentRepository.findByModuleId(moduleId);
    return this.moduleContentRepository.create({ ...dto, moduleId, order: dto.order ?? existing.length });
  }

  async updateContentForTeacher(instituteId: string, courseId: string, moduleId: string, contentId: string, userId: string, dto: Partial<{ title: string; description: string; url: string; quizData: any; order: number }>) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const content = await this.moduleContentRepository.findById(contentId);
    if (!content || content.moduleId !== moduleId) throw new NotFoundException('Content not found');
    return this.moduleContentRepository.update(contentId, dto as any);
  }

  async deleteContentForTeacher(instituteId: string, courseId: string, moduleId: string, contentId: string, userId: string) {
    await this._assertTeacherOwns(courseId, instituteId, userId);
    const content = await this.moduleContentRepository.findById(contentId);
    if (!content || content.moduleId !== moduleId) throw new NotFoundException('Content not found');
    await this.moduleContentRepository.delete(contentId);
    return { message: 'Content deleted successfully' };
  }

  async createAssessmentForTeacher(
    instituteId: string,
    courseId: string,
    moduleId: string,
    userId: string,
    dto: { title: string; description?: string; quizData: any },
  ) {
    // Verify teacher is assigned to this course
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
      relations: ['teachers'],
    });
    if (!course) throw new NotFoundException('Course not found');

    const isAssigned = course.teachers?.some((t) => t.userId === userId);
    if (!isAssigned) throw new ForbiddenException('You are not assigned to this course');

    // Verify module belongs to course
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException('Module not found in this course');
    }

    const existingContents = await this.moduleContentRepository.findByModuleId(moduleId);

    return this.moduleContentRepository.create({
      title: dto.title,
      description: dto.description,
      type: ContentType.QUIZ,
      quizData: dto.quizData,
      moduleId,
      order: existingContents.length,
    });
  }

  async getCourseWithModulesForTeacher(instituteId: string, courseId: string, userId: string) {
    const course = await this.courseRepository.findCourseWithModulesForTeacher(courseId, userId, instituteId);
    if (!course) {
      throw new NotFoundException('Course not found or not assigned to you');
    }
    const { modules, ...courseBase } = course as any;
    return {
      course: this.mapCourseToResponse(course),
      modules: (modules ?? []).map((mod: any) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        courseId: mod.courseId,
        contents: (mod.contents ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          type: c.type,
          url: c.url,
          quizData: c.quizData,
          order: c.order,
          moduleId: c.moduleId,
        })),
      })),
    };
  }

  async getMyAssessmentsForTeacher(instituteId: string, userId: string) {
    const courses = await this.courseRepository.findCoursesWithQuizzesByTeacher(userId, instituteId);
    return courses
      .map((course) => {
        const { modules, teachers, ...courseRest } = course as any;
        const quizzes = (modules ?? []).flatMap((mod: any) =>
          (mod.contents ?? []).map((content: any) => ({
            content,
            module: { id: mod.id, title: mod.title, order: mod.order },
          }))
        );
        return {
          course: { ...courseRest, assignedTeacher: this.mapCourseToResponse(course).assignedTeacher },
          quizzes,
        };
      })
      .filter((g) => g.quizzes.length > 0);
  }

  async getMyCoursesForStudent(instituteId: string, userId: string) {
    const courses = await this.courseRepository.findByStudentUserId(userId, instituteId);
    return courses.map(course => ({
      ...this.mapCourseToResponse(course),
      moduleCount: course.modules?.length ?? 0,
    }));
  }

  async getMyCoursesForTeacher(instituteId: string, userId: string) {
    const courses = await this.courseRepository.findByTeacherUserId(userId, instituteId);
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
