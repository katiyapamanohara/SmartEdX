import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

import { Institute } from '../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../modules/auth/entities/institute-role.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'api_gateway',
  entities: [Institute, InstituteUser, InstituteRole],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: true, // Don't auto-run migrations
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
