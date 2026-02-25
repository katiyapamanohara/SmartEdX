import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Institute } from '../../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../../modules/auth/entities/institute-role.entity';
import { Student } from '../../../modules/auth/entities/student.entity';
import { Teacher } from '../../../modules/auth/entities/teacher.entity';
import { Course } from '../../../modules/auth/entities/course.entity';
import { CourseModule } from '../../../modules/auth/entities/course-module.entity';
import { ModuleContent } from '../../../modules/auth/entities/module-content.entity';

import { InstituteRepository } from './institute.repository';
import { InstituteUserRepository } from './institute-user.repository';
import { InstituteRoleRepository } from './institute-role.repository';
import { TeacherRepository } from './teacher.repository';
import { StudentRepository } from './student.repository';
import { CourseRepository } from './course.repository';
import { CourseModuleRepository } from './course-module.repository';
import { ModuleContentRepository } from './module-content.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [TypeOrmModule.forFeature([Institute, InstituteUser, InstituteRole, Student, Teacher, Course, CourseModule, ModuleContent])],
  providers: [InstituteRepository, InstituteUserRepository, InstituteRoleRepository, TeacherRepository, StudentRepository, CourseRepository, CourseModuleRepository, ModuleContentRepository],
  exports: [InstituteRepository, InstituteUserRepository, InstituteRoleRepository, TeacherRepository, StudentRepository, CourseRepository, CourseModuleRepository, ModuleContentRepository],
})
export class RepositoriesModule {}
