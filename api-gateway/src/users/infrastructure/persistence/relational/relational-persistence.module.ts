import { Module } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { UsersRelationalRepository } from './repositories/user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, StatusEntity])],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersRelationalRepository,
    },
  ],
  exports: [UserRepository, TypeOrmModule],
})
export class RelationalUserPersistenceModule {}
