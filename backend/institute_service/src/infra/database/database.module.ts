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
import { Notification } from '../../modules/auth/entities/notification.entity';
import { Exam } from '../../modules/auth/entities/exam.entity';
import { LiveSession } from '../../modules/auth/entities/live-session.entity';
import { LiveParticipant } from '../../modules/auth/entities/live-participant.entity';

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
          Institute,
          InstituteUser,
          InstituteRole,
          Student,
          Teacher,
          Course,
          CourseModule,
          ModuleContent,
          Recording,
          RecordingCategory,
          RecordingCourseAssignment,
          Message,
          Notification,
          Exam,
          LiveSession,
          LiveParticipant,
        ],
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun: true,
        ssl: configService.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        // ── Neon cold-start resilience ────────────────────────────────────────
        // Neon free tier suspends after ~5 min; the first reconnect can take
        // up to 10 s.  We raise timeouts and let TypeORM retry automatically.
        retryAttempts: 5,
        retryDelay: 3000,        // ms between retries
        connectTimeoutMS: 15000, // 15 s — gives Neon enough time to wake up
        extra: {
          // pg-driver level options
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 30000,  // release idle connections after 30 s
          max: 10,                   // connection pool cap
          // Keepalive so idle connections don't hit the cloud firewall timeout
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
