import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Institute } from '../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../modules/auth/entities/institute-role.entity';
import { Student } from '../../modules/auth/entities/student.entity';
import { Teacher } from '../../modules/auth/entities/teacher.entity';
import { Course } from '../../modules/auth/entities/course.entity';
import { CourseModule } from '../../modules/auth/entities/course-module.entity';
import { ModuleContent } from '../../modules/auth/entities/module-content.entity';
import { Recording } from '../../modules/auth/entities/recording.entity';
import { RecordingCategory } from '../../modules/auth/entities/recording-category.entity';
import { RecordingCourseAssignment } from '../../modules/auth/entities/recording-course-assignment.entity';
import { Message } from '../../modules/auth/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'api_gateway'),
        entities: [
          Institute, InstituteUser, InstituteRole, Student, Teacher,
          Course, CourseModule, ModuleContent,
          Recording, RecordingCategory, RecordingCourseAssignment,
          Message,
        ],
        synchronize: true, // Auto-sync for dev
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/*.ts'],
        migrationsRun: true, // Auto-run migrations on startup
        ssl: {
          rejectUnauthorized: false, // Required for Supabase connections
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
