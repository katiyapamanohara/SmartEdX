# PostgreSQL Database Setup

## Quick Start with Docker

### Start PostgreSQL
```bash
docker-compose up -d
```

### Stop PostgreSQL
```bash
docker-compose down
```

### Stop and remove data
```bash
docker-compose down -v
```

## Manual PostgreSQL Installation

### macOS (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Create Database
```bash
createdb api_gateway
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database and User
```bash
sudo -u postgres psql
CREATE DATABASE api_gateway;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE api_gateway TO postgres;
\q
```

## Database Configuration

Configure database connection in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=api_gateway
```

## TypeORM Synchronization

In development mode, TypeORM will automatically create/update database tables based on entities.

To disable auto-synchronization in production, set:
```env
NODE_ENV=production
```

## Database Migrations

### Generate Migration
```bash
npm run migration:generate -- -n MigrationName
```

### Run Migrations
```bash
npm run migration:run
```

### Revert Migration
```bash
npm run migration:revert
```

## Verify Database Connection

Start the application and check logs:
```bash
npm run start:dev
```

You should see:
```
[TypeORM] Connection to database established
```

## Database Schema

The API Gateway database stores:

### Users Table
- `id` (UUID, Primary Key)
- `firstName` (VARCHAR)
- `lastName` (VARCHAR)
- `email` (VARCHAR, Unique, Indexed)
- `password` (VARCHAR, Hashed)
- `role` (ENUM: admin, instructor, student)
- `isActive` (BOOLEAN)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
docker-compose ps
# or
brew services list | grep postgresql
```

### Database Doesn't Exist
```bash
# Using Docker
docker-compose exec postgres createdb -U postgres api_gateway

# Manual
createdb api_gateway
```

### Permission Denied
```bash
# Grant permissions
docker-compose exec postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE api_gateway TO postgres;"
```

## Database Tools

### pgAdmin (GUI)
Download from: https://www.pgadmin.org/

Connection details:
- Host: localhost
- Port: 5432
- Database: api_gateway
- Username: postgres
- Password: postgres

### psql (CLI)
```bash
# Using Docker
docker-compose exec postgres psql -U postgres -d api_gateway

# Direct connection
psql -h localhost -U postgres -d api_gateway
```

Common commands:
- `\dt` - List tables
- `\d users` - Describe users table
- `SELECT * FROM users;` - Query users
- `\q` - Quit
