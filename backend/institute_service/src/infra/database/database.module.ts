import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
        entities: [Institute, InstituteUser, InstituteRole],
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
