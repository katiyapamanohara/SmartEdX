import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

import { Institute } from '../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../modules/auth/entities/institute-role.entity';
import { Course } from '../../modules/auth/entities/course.entity';
import { CourseModule } from '../../modules/auth/entities/course-module.entity';
import { ModuleContent } from '../../modules/auth/entities/module-content.entity';
import { Teacher } from '../../modules/auth/entities/teacher.entity';
import { Student } from '../../modules/auth/entities/student.entity';
import { Exam } from '../../modules/auth/entities/exam.entity';
import { LiveSession } from '../../modules/auth/entities/live-session.entity';
import { LiveParticipant } from '../../modules/auth/entities/live-participant.entity';
import { Message } from '../../modules/auth/entities/message.entity';
import { Notification } from '../../modules/auth/entities/notification.entity';
import { Recording } from '../../modules/auth/entities/recording.entity';
import { RecordingCategory } from '../../modules/auth/entities/recording-category.entity';
import { RecordingCourseAssignment } from '../../modules/auth/entities/recording-course-assignment.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'api_gateway',
  entities: [
    Institute,
    InstituteUser,
    InstituteRole,
    Course,
    CourseModule,
    ModuleContent,
    Teacher,
    Student,
    Exam,
    LiveSession,
    LiveParticipant,
    Message,
    Notification,
    Recording,
    RecordingCategory,
    RecordingCourseAssignment,
  ],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: true, // Don't auto-run migrations
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
