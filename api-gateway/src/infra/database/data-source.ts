import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'api_gateway',
  entities: [User, Role],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false, // Don't auto-run migrations
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
