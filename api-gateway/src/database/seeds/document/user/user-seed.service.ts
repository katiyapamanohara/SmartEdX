import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserSchemaClass } from '../../../../users/infrastructure/persistence/document/entities/user.schema';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly model: Model<UserSchemaClass>,
  ) {}

  async run() {
    // Remove unwanted existing users
    await this.model.deleteMany({
      email: { $in: ['admin@example.com', 'john.doe@example.com', 'admin'] }
    });

    // Check if admin@gmail.com user exists
    const existingAdmin = await this.model.findOne({
      email: 'admin@gmail.com'
    });

    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admini', salt);

    if (existingAdmin) {
      // Update existing admin user
      await this.model.updateOne(
        { email: 'admin@gmail.com' },
        {
          password: password,
          firstName: 'Admin',
          lastName: 'User',
          role: {
            _id: RoleEnum.admin,
          },
          status: {
            _id: StatusEnum.active,
          },
        }
      );
    } else {
      // Create new admin user
      const data = new this.model({
        email: 'admin@gmail.com',
        password: password,
        firstName: 'Admin',
        lastName: 'User',
        role: {
          _id: RoleEnum.admin,
        },
        status: {
          _id: StatusEnum.active,
        },
      });
      await data.save();
    }
  }
}
