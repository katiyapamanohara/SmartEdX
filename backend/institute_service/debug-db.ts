
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { dataSourceOptions } from './src/infra/database/data-source';

config();

async function checkTables() {
  const dataSource = new DataSource({ ...dataSourceOptions, migrationsRun: false });
  await dataSource.initialize();
  
  const queryRunner = dataSource.createQueryRunner();
  const tables = await queryRunner.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  
  console.log('Tables in public schema:', tables);

  const userColumns = await queryRunner.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
  console.log('Users table columns:', userColumns);
  await dataSource.destroy();
}

checkTables().catch(console.error);
