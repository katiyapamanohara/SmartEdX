# Repository Pattern Implementation

This document describes the repository pattern implementation in the API Gateway service.

## Overview

The repository pattern provides a clean abstraction layer between the domain logic and the data access layer. This implementation uses TypeORM as the underlying ORM.

## Architecture

### Base Repository

All repositories extend from a common base repository that provides standard CRUD operations:

```typescript
BaseRepository<T extends ObjectLiteral>
```

#### Available Methods

- **create(data)** - Create a new entity
- **createMany(data[])** - Create multiple entities
- **findById(id)** - Find entity by ID
- **findOne(options)** - Find one entity by conditions
- **findAll(options)** - Find all entities matching conditions
- **findBy(where)** - Find entities by specific conditions
- **update(id, data)** - Update entity by ID
- **delete(id)** - Hard delete entity by ID
- **softDelete(id)** - Soft delete entity (if supported)
- **count(where)** - Count entities matching conditions
- **exists(where)** - Check if entity exists
- **save(data)** - Save entity (create or update)
- **saveMany(data[])** - Save multiple entities

### UserRepository

The `UserRepository` extends `BaseRepository<User>` and adds user-specific methods:

#### Specific Methods

- **findByEmail(email)** - Find user by email address
- **findActiveByEmail(email)** - Find active user by email
- **findAllActive()** - Find all active users
- **emailExists(email)** - Check if email already exists
- **findByIdWithRelations(id)** - Find user with related entities
- **deactivate(id)** - Deactivate user account
- **activate(id)** - Activate user account
- **updatePassword(id, hashedPassword)** - Update user password

## Usage

### 1. Import RepositoriesModule

Add the `RepositoriesModule` to your feature module:

```typescript
import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../infra/database/repositories';

@Module({
  imports: [RepositoriesModule],
  // ...
})
export class YourModule {}
```

### 2. Inject Repository in Service

Inject the repository into your service:

```typescript
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../infra/database/repositories';

@Injectable()
export class YourService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUser(email: string) {
    return this.userRepository.findByEmail(email);
  }
}
```

### 3. Example Usage

```typescript
// Create a user
const user = await userRepository.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: hashedPassword,
  role: Role.STUDENT,
});

// Find user by email
const user = await userRepository.findByEmail('john@example.com');

// Check if email exists
const exists = await userRepository.emailExists('john@example.com');

// Update user
await userRepository.update(userId, { firstName: 'Jane' });

// Deactivate user
await userRepository.deactivate(userId);

// Find all active users
const activeUsers = await userRepository.findAllActive();
```

## Creating New Repositories

To create a repository for a new entity:

### 1. Create the Repository Class

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { YourEntity } from '../../../modules/your-module/entities/your.entity';

@Injectable()
export class YourEntityRepository extends BaseRepository<YourEntity> {
  constructor(
    @InjectRepository(YourEntity)
    private readonly yourEntityRepository: Repository<YourEntity>,
  ) {
    super(yourEntityRepository);
  }

  // Add entity-specific methods here
  async findByCustomField(field: string): Promise<YourEntity | null> {
    return this.yourEntityRepository.findOne({
      where: { customField: field },
    });
  }
}
```

### 2. Register in RepositoriesModule

Add your entity and repository to the `RepositoriesModule`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { YourEntity } from '../../../modules/your-module/entities/your.entity';
import { UserRepository } from './user.repository';
import { YourEntityRepository } from './your-entity.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, YourEntity])],
  providers: [UserRepository, YourEntityRepository],
  exports: [UserRepository, YourEntityRepository],
})
export class RepositoriesModule {}
```

### 3. Export from Index

Add your repository to the exports in `index.ts`:

```typescript
export * from './your-entity.repository';
```

## Benefits

1. **Separation of Concerns** - Business logic is separated from data access logic
2. **Testability** - Repositories can be easily mocked for unit testing
3. **Maintainability** - Database queries are centralized in one place
4. **Type Safety** - Full TypeScript support with strong typing
5. **Reusability** - Common operations are inherited from BaseRepository
6. **Flexibility** - Easy to add entity-specific methods
7. **Consistency** - Standardized API across all repositories

## Best Practices

1. **Keep repositories focused** - Only include data access logic
2. **Use specific methods** - Create custom methods for complex queries
3. **Avoid business logic** - Keep business logic in services
4. **Use transactions** - Wrap multiple operations in transactions when needed
5. **Handle errors** - Let errors propagate to the service layer
6. **Document methods** - Add JSDoc comments to custom methods

## File Structure

```
src/
└── infra/
    └── database/
        └── repositories/
            ├── base.repository.interface.ts  # Repository interface
            ├── base.repository.ts             # Base implementation
            ├── user.repository.ts             # User repository
            ├── repositories.module.ts         # Module configuration
            └── index.ts                       # Barrel exports
```

## Migration from Direct Repository Usage

To migrate existing code from direct TypeORM repository usage:

1. Replace `@InjectRepository(Entity)` with repository injection
2. Replace `Repository<Entity>` with `EntityRepository`
3. Update method calls to use repository methods
4. Remove direct TypeORM operations

### Before:
```typescript
constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,
) {}

async findUser(email: string) {
  return this.userRepository.findOne({ where: { email } });
}
```

### After:
```typescript
constructor(
  private readonly userRepository: UserRepository,
) {}

async findUser(email: string) {
  return this.userRepository.findByEmail(email);
}
```
