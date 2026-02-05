import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { Role } from '../../../modules/auth/entities/role.entity';
import { Institute } from '../../../modules/auth/entities/institute.entity';
import { UserRepository } from './user.repository';
import { RoleRepository } from './role.repository';
import { InstituteRepository } from './institute.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Institute])],
  providers: [UserRepository, RoleRepository, InstituteRepository],
  exports: [UserRepository, RoleRepository, InstituteRepository],
})
export class RepositoriesModule {}
