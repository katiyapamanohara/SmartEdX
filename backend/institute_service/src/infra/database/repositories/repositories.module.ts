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
import { Recording } from '../../../modules/auth/entities/recording.entity';
import { RecordingCategory } from '../../../modules/auth/entities/recording-category.entity';
import { RecordingCourseAssignment } from '../../../modules/auth/entities/recording-course-assignment.entity';
import { Message } from '../../../modules/auth/entities/message.entity';
import { Notification } from '../../../modules/auth/entities/notification.entity';
import { Exam } from '../../../modules/auth/entities/exam.entity';
import { LiveSession } from '../../../modules/auth/entities/live-session.entity';
import { LiveParticipant } from '../../../modules/auth/entities/live-participant.entity';

import { InstituteRepository } from './institute.repository';
import { InstituteUserRepository } from './institute-user.repository';
import { InstituteRoleRepository } from './institute-role.repository';
import { TeacherRepository } from './teacher.repository';
import { StudentRepository } from './student.repository';
import { CourseRepository } from './course.repository';
import { CourseModuleRepository } from './course-module.repository';
import { ModuleContentRepository } from './module-content.repository';
import { RecordingRepository } from './recording.repository';
import { RecordingCategoryRepository } from './recording-category.repository';
import { RecordingCourseAssignmentRepository } from './recording-course-assignment.repository';
import { MessageRepository } from './message.repository';
import { NotificationRepository } from './notification.repository';
import { ExamRepository } from './exam.repository';
import { LiveSessionRepository } from './live-session.repository';
import { LiveParticipantRepository } from './live-participant.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Institute, InstituteUser, InstituteRole, Student, Teacher,
      Course, CourseModule, ModuleContent,
      Recording, RecordingCategory, RecordingCourseAssignment,
      Message,
      Notification,
      Exam,
      LiveSession,
      LiveParticipant,
    ]),
  ],
  providers: [
    InstituteRepository, InstituteUserRepository, InstituteRoleRepository,
    TeacherRepository, StudentRepository, CourseRepository,
    CourseModuleRepository, ModuleContentRepository,
    RecordingRepository, RecordingCategoryRepository, RecordingCourseAssignmentRepository,
    MessageRepository,
    NotificationRepository,
    ExamRepository,
    LiveSessionRepository,
    LiveParticipantRepository,
  ],
  exports: [
    InstituteRepository, InstituteUserRepository, InstituteRoleRepository,
    TeacherRepository, StudentRepository, CourseRepository,
    CourseModuleRepository, ModuleContentRepository,
    RecordingRepository, RecordingCategoryRepository, RecordingCourseAssignmentRepository,
    MessageRepository,
    NotificationRepository,
    ExamRepository,
    LiveSessionRepository,
    LiveParticipantRepository,
  ],
})
export class RepositoriesModule {}
