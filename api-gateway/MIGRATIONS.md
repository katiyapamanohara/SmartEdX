# Database Migrations Guide

## Overview

This project uses TypeORM migrations to manage database schema changes. Migrations ensure that database changes are versioned, reproducible, and can be safely applied across different environments.

## Quick Start

### 1. Start PostgreSQL Database
```bash
npm run db:up
```

### 2. Run Migrations
```bash
npm run migration:run
```

### 3. Start the Application
```bash
npm run start:dev
```

The application will automatically run pending migrations on startup.

## Migration Commands

### Run All Pending Migrations
```bash
npm run migration:run
```
Executes all migrations that haven't been run yet.

### Revert Last Migration
```bash
npm run migration:revert
```
Reverts the most recently executed migration.

### Show Migration Status
```bash
npm run migration:show
```
Displays which migrations have been run and which are pending.

### Generate Migration from Entity Changes
```bash
npm run migration:generate -- src/infra/database/migrations/MigrationName
```
Automatically generates a migration by comparing entities with the current database schema.

### Create Empty Migration
```bash
npm run migration:create -- src/infra/database/migrations/MigrationName
```
Creates a new empty migration file for manual editing.

### Drop All Database Schema
```bash
npm run schema:drop
```
⚠️ **WARNING**: This drops all tables. Use with caution!

### Sync Schema (Development Only)
```bash
npm run schema:sync
```
⚠️ **WARNING**: Synchronizes database schema with entities. Don't use in production!

## Available Migrations

### 1700000000000-CreateUsersTable.ts
Creates the `users` table with the following structure:
- `id` (UUID, Primary Key)
- `firstName` (VARCHAR)
- `lastName` (VARCHAR)
- `email` (VARCHAR, Unique, Indexed)
- `password` (VARCHAR, Hashed)
- `role` (ENUM: admin, instructor, student)
- `isActive` (BOOLEAN)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

Includes indexes on:
- `email` for faster user lookups
- `role` for filtering users by role

### 1700000000001-SeedAdminUser.ts
Seeds the database with default users for testing:

**Admin User:**
- Email: admin@example.com
- Password: admin123
- Role: admin

**Instructor User:**
- Email: instructor@example.com
- Password: instructor123
- Role: instructor

**Student User:**
- Email: student@example.com
- Password: student123
- Role: student

⚠️ **IMPORTANT**: Change these passwords in production!

## Creating New Migrations

### Automatic Migration Generation

1. Modify your entity (e.g., add a new field to User entity)
2. Generate migration:
```bash
npm run migration:generate -- src/infra/database/migrations/AddNewFieldToUser
```

TypeORM will compare entities with the database and generate the necessary SQL.

### Manual Migration Creation

1. Create a new migration:
```bash
npm run migration:create -- src/infra/database/migrations/CustomMigration
```

2. Edit the generated file:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomMigration1700000000002 implements MigrationInterface {
  name = 'CustomMigration1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your SQL here
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN phone VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes here
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN phone
    `);
  }
}
```

3. Run the migration:
```bash
npm run migration:run
```

## Migration Best Practices

### 1. Always Test Migrations
Test both `up` and `down` methods:
```bash
npm run migration:run    # Apply
npm run migration:revert # Revert
npm run migration:run    # Apply again
```

### 2. Keep Migrations Small
Create separate migrations for different changes:
- ✅ One migration per logical change
- ❌ Don't combine unrelated changes

### 3. Never Modify Existing Migrations
Once a migration has been run in production:
- ✅ Create a new migration to fix issues
- ❌ Don't modify the original migration

### 4. Handle Data Migrations Carefully
When changing data structure:
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add new column
  await queryRunner.query(`ALTER TABLE users ADD COLUMN fullName VARCHAR`);
  
  // 2. Migrate data
  await queryRunner.query(`
    UPDATE users 
    SET fullName = CONCAT(firstName, ' ', lastName)
  `);
  
  // 3. Make column required (if needed)
  await queryRunner.query(`
    ALTER TABLE users 
    ALTER COLUMN fullName SET NOT NULL
  `);
}
```

### 5. Use Transactions
Migrations run in transactions by default. For complex migrations:
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // All queries run in a single transaction
  // If one fails, all are rolled back
  await queryRunner.query(`...`);
  await queryRunner.query(`...`);
}
```

## Production Workflow

### Initial Setup
```bash
# 1. Set up database
npm run db:up

# 2. Run all migrations
npm run migration:run

# 3. Start application
npm run start:prod
```

### Deploying New Migrations
```bash
# 1. Pull latest code
git pull

# 2. Build application
npm run build

# 3. Run new migrations
npm run migration:run

# 4. Restart application
pm2 restart api-gateway
```

### Rollback in Production
```bash
# Revert last migration
npm run migration:revert

# Restart application
pm2 restart api-gateway
```

## Troubleshooting

### Migration Failed

**Error**: Migration failed to execute
```bash
# Check which migrations have run
npm run migration:show

# Drop the failed migration entry (if needed)
# Connect to database
docker-compose exec postgres psql -U postgres -d api_gateway

# View migrations table
SELECT * FROM migrations;

# Delete failed migration
DELETE FROM migrations WHERE timestamp = 1700000000000;
```

### Database Out of Sync

**Issue**: Entities don't match database schema

**Solution 1** - Generate catch-up migration:
```bash
npm run migration:generate -- src/infra/database/migrations/SyncDatabase
npm run migration:run
```

**Solution 2** - Reset database (development only):
```bash
npm run db:reset
npm run migration:run
```

### UUID Extension Error

**Error**: `function uuid_generate_v4() does not exist`

**Solution**:
```bash
docker-compose exec postgres psql -U postgres -d api_gateway
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Testing Migrations

### Unit Testing Migrations
Create a test database and run migrations:
```bash
# Set test database in .env.test
DB_DATABASE=api_gateway_test

# Run migrations
NODE_ENV=test npm run migration:run

# Run tests
npm test
```

### Verify Migration
```bash
# 1. Check migration status
npm run migration:show

# 2. Verify table structure
docker-compose exec postgres psql -U postgres -d api_gateway
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users LIMIT 5;  # View data
```

## Migration File Structure

```
src/infra/database/
├── data-source.ts          # TypeORM configuration
├── database.module.ts      # NestJS database module
└── migrations/
    ├── 1700000000000-CreateUsersTable.ts
    ├── 1700000000001-SeedAdminUser.ts
    └── [timestamp]-[MigrationName].ts
```

## Environment Variables

Ensure these are set in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=api_gateway
NODE_ENV=development
```

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)
