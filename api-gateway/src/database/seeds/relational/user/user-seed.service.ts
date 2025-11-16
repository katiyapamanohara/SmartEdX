import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';

// Predefined UUIDs for consistent role mapping
const ROLE_UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  user: '550e8400-e29b-41d4-a716-446655440002',
};

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
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

    if (existingAdmin) {
      // Update existing admin user
      await this.repository.update(
        { email: 'admin@gmail.com' },
        {
          firstName: 'Admin',
          lastName: 'User',
          password,
          role: {
            id: ROLE_UUIDS.admin,
            name: 'Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
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
            id: ROLE_UUIDS.admin,
            name: 'Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }
  }
}
