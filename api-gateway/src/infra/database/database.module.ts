import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';

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
        entities: [User, Role],
        synchronize: true, // Auto-sync for dev
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/*.ts'],
        migrationsRun: true, // Auto-run migrations on startup
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
