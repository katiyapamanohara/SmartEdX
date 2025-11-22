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

@Module({
  imports: [
    RepositoriesModule,
    FirebaseModule,
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
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    FirebaseAuthStrategy,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
    SeedService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
    SeedService,
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    // Auto-seed admin users on application startup
    await this.seedService.seedAdminUsers();
  }
}
