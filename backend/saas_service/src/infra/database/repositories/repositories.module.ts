import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { Role } from '../../../modules/auth/entities/role.entity';
import { Institute } from '../../../modules/auth/entities/institute.entity';
import { InstituteUser } from '../../../modules/auth/entities/institute-user.entity';
import { InstituteRole } from '../../../modules/auth/entities/institute-role.entity';
import { Subscription } from '../../../modules/auth/entities/subscription.entity';
import { UserRepository } from './user.repository';
import { RoleRepository } from './role.repository';
import { InstituteRepository } from './institute.repository';
import { InstituteUserRepository } from './institute-user.repository';
import { InstituteRoleRepository } from './institute-role.repository';
import { SubscriptionRepository } from './subscription.repository';

/**
 * Repositories Module
 * Centralizes all repository providers for dependency injection
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Institute, InstituteUser, InstituteRole, Subscription])],
  providers: [UserRepository, RoleRepository, InstituteRepository, InstituteUserRepository, InstituteRoleRepository, SubscriptionRepository],
  exports: [UserRepository, RoleRepository, InstituteRepository, InstituteUserRepository, InstituteRoleRepository, SubscriptionRepository],
})
export class RepositoriesModule {}
