import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FirebaseAuthStrategy } from './strategies/firebase.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SeedService } from './services/seed.service';
import { RepositoriesModule } from '../../infra/database/repositories';
import { FirebaseModule } from '../../infra/firebase/firebase.module';
import { MinioModule } from '../../infra/storage/minio.module';
import { VoiceAgentClient } from '../../infra/http/voice-agent.client';

import { InstituteUserController } from './institute-user.controller';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseModuleController } from './course-module.controller';
import { CourseModuleService } from './course-module.service';
import { ModuleContentController } from './module-content.controller';
import { ModuleContentService } from './module-content.service';
import { RecordingController } from './recording.controller';
import { RecordingService } from './recording.service';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { LiveClassController } from './live-class.controller';
import { LiveClassService } from './live-class.service';
import { LiveGateway } from './live.gateway';

@Module({
  imports: [
    RepositoriesModule,
    FirebaseModule,
    MinioModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, InstituteUserController, CourseController, CourseModuleController, ModuleContentController, RecordingController, MessageController, LiveClassController],
  providers: [
    AuthService,
    CourseService,
    CourseModuleService,
    ModuleContentService,
    RecordingService,
    MessageService,
    MessageGateway,
    LiveClassService,
    LiveGateway,
    JwtStrategy,
    FirebaseAuthStrategy,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
    SeedService,
    VoiceAgentClient,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    // Auto-seed admin users on application startup
    await this.seedService.seedAdminUsers();
  }
}
