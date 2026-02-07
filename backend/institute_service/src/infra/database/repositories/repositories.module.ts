import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Institute } from '../../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../../modules/auth/entities/institute-role.entity';

import { InstituteRepository } from './institute.repository';
import { InstituteUserRepository } from './institute-user.repository';
import { InstituteRoleRepository } from './institute-role.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [TypeOrmModule.forFeature([Institute, InstituteUser, InstituteRole])],
  providers: [InstituteRepository, InstituteUserRepository, InstituteRoleRepository],
  exports: [InstituteRepository, InstituteUserRepository, InstituteRoleRepository],
})
export class RepositoriesModule {}
