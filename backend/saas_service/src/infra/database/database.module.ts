import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';
import { Institute } from '../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../modules/auth/entities/institute-role.entity';

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
        entities: [User, Role, Institute, InstituteUser, InstituteRole],
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun: true,
        ssl: configService.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        retryAttempts: 5,
        retryDelay: 3000,
        connectTimeoutMS: 15000,
        extra: {
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 30000,
          max: 10,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
