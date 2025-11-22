# Role Table Migration Guide

## Overview

Successfully migrated from using a Role enum to a separate Role table with foreign key relationship to the User table.

## Changes Made

### 1. New Entities

#### Role Entity (`role.entity.ts`)
```typescript
@Entity('roles')
export class Role {
  id: string (UUID, Primary Key)
  name: string (unique, max 50 chars)
  description: string (nullable)
  users: User[] (One-to-Many relationship)
  createdAt: Date
  updatedAt: Date
}
```

#### Updated User Entity (`user.entity.ts`)
- **Removed:** `role` enum column
- **Added:** `roleId` (UUID, Foreign Key to roles table)
- **Added:** `role` relationship (ManyToOne with eager loading)

### 2. Repository Layer

#### RoleRepository (`role.repository.ts`)
- `findByName(name)` - Find role by name
- `findAllWithUsers()` - Find all roles with user relationships
- `roleNameExists(name)` - Check if role name exists
- `findOrCreate(name, description)` - Get or create role

#### Updated RepositoriesModule
- Added Role entity to TypeORM imports
- Exported RoleRepository for dependency injection

### 3. Database Migration

**File:** `1700000000002-CreateRolesTableAndUpdateUsers.ts`

**Up Migration:**
1. Creates `roles` table with id, name, description, timestamps
2. Inserts default roles: admin, instructor, student
3. Adds `roleId` column to users table
4. Migrates existing enum data to foreign key references
5. Drops old role enum column
6. Creates foreign key constraint (RESTRICT on delete, CASCADE on update)
7. Adds index on roleId for performance

**Down Migration:**
- Reverses all changes and restores enum column

### 4. Service Updates

#### AuthService
- Added RoleRepository dependency
- **register()** - Auto-assigns 'student' role from Role table
- **login()** - Returns role name instead of enum
- Token generation uses role.name

#### SeedService  
- Added RoleRepository dependency
- **seedAdminUsers()** - Looks up roles by name before creating users
- **createAdminUser()** - Gets admin role from database
- **getAllAdmins()** - Filters by roleId with eager-loaded role
- **resetPassword()** - Checks role using Role entity (prevents student password reset)

### 5. Guards & Decorators

#### Updated Roles Decorator
```typescript
// Before: @Roles(Role.ADMIN)
// After:  @Roles('admin')
```

#### Updated RolesGuard
- Now accepts string array instead of enum array
- Compares user.role (string) with required roles

### 6. DTOs & Interfaces

#### RegisterDto
- **Removed:** `role` field (auto-assigned as student)

#### JwtPayload
- Changed `role: Role` → `role: string`

### 7. Controller Updates

All admin endpoints updated to use string literals:
```typescript
@Roles('admin') // instead of @Roles(Role.ADMIN)
```

## Database Schema

### roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### users Table (Updated)
```sql
ALTER TABLE users 
  ADD COLUMN "roleId" UUID NOT NULL
  REFERENCES roles(id) 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

CREATE INDEX IDX_USER_ROLE_ID ON users("roleId");
```

### Default Roles
1. **admin** - Administrator with full system access
2. **instructor** - Instructor who can create and manage courses
3. **student** - Student who can enroll in courses and take quizzes

## Running the Migration

```bash
# Run migrations
npm run migration:run

# Or if using TypeORM CLI
npx typeorm migration:run -d src/infra/database/data-source.ts
```

## Benefits

1. **Flexibility** - Can add/modify roles without code changes
2. **Extensibility** - Easy to add custom roles with descriptions
3. **Data Integrity** - Foreign key constraints ensure data consistency
4. **Performance** - Indexed roleId for fast lookups
5. **Auditing** - Track when roles were created/updated
6. **Scalability** - Can add role permissions, hierarchies, etc.

## Breaking Changes

### API Responses
Role is now returned as an object in some contexts:
```typescript
// Before
{ role: "admin" }

// After (with eager loading)
{ role: { id: "uuid", name: "admin", description: "..." } }
```

### Registration
Users can no longer specify role during registration - always assigned 'student' role.

### Authorization
Use string literals instead of enum values:
```typescript
// Before
@Roles(Role.ADMIN, Role.INSTRUCTOR)

// After
@Roles('admin', 'instructor')
```

## Rollback

To rollback the migration:
```bash
npx typeorm migration:revert -d src/infra/database/data-source.ts
```

This will:
- Restore the role enum column
- Remove the roles table
- Migrate foreign key data back to enum values
