import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { Role } from '../../../modules/auth/entities/role.entity';
import { UserRepository } from './user.repository';
import { RoleRepository } from './role.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  providers: [UserRepository, RoleRepository],
  exports: [UserRepository, RoleRepository],
})
export class RepositoriesModule {}
