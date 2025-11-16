import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';


const ROLE_UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  user: '550e8400-e29b-41d4-a716-446655440002',
};

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
    @InjectRepository(StatusEntity)
    private statusRepository: Repository<StatusEntity>,
  ) {}

  async run() {
    // Remove unwanted existing users
    await this.repository.delete({
      email: 'admin@example.com',
    });
    
    await this.repository.delete({
      email: 'john.doe@example.com',
    });

    // Remove existing admin user (old one with just 'admin' email)
    await this.repository.delete({
      email: 'admin',
    });

    // Check if admin@gmail.com user exists
    const existingAdmin = await this.repository.findOne({
      where: {
        email: 'admin@gmail.com',
      },
    });

    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admini', salt);

    const activeStatus = await this.statusRepository.findOne({
      where: { name: StatusEnum.active },
    });

    if (!activeStatus) {
      throw new Error('Active status not found. Please run status seed first.');
    }

    if (existingAdmin) {
      // Update existing admin user
      await this.repository.update(
        { email: 'admin@gmail.com' },
        {
          firstName: 'Admin',
          lastName: 'User',
          password,
          role: {
            roleId: ROLE_UUIDS.admin,
            name: 'Admin',
          },
          status: activeStatus,
        }
      );
    } else {
      // Create new admin user
      await this.repository.save(
        this.repository.create({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@gmail.com',
          password,
          role: {
            roleId: ROLE_UUIDS.admin,
            name: 'Admin',
          },
          status: activeStatus,
        }),

      );
    }
  }
}
