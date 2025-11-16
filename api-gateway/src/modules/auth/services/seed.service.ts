import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../../../core/enums/role.enum';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Seed default admin users if they don't exist
   */
  async seedAdminUsers(): Promise<void> {
    try {
      const adminUsers = [
        {
          firstName: 'System',
          lastName: 'Administrator',
          email: 'admin@gmail.com',
          password: 'Admin@123',
          role: Role.ADMIN,
        },
        {
          firstName: 'John',
          lastName: 'Instructor',
          email: 'instructor@gmail.com',
          password: 'Instructor@123',
          role: Role.INSTRUCTOR,
        },
        {
          firstName: 'Jane',
          lastName: 'Student',
          email: 'student@gmail.com',
          password: 'Student@123',
          role: Role.STUDENT,
        },
      ];

      for (const userData of adminUsers) {
        const existingUser = await this.userRepository.findOne({
          where: { email: userData.email },
        });

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          const user = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            isActive: true,
          });

          await this.userRepository.save(user);
          this.logger.log(`✅ Created ${userData.role} user: ${userData.email}`);
        } else {
          this.logger.log(
            `ℹ️  ${userData.role} user already exists: ${userData.email}`,
          );
        }
      }

      this.logger.log('🌱 Seed process completed');
    } catch (error) {
      this.logger.error('❌ Error seeding admin users:', error);
      throw error;
    }
  }

  /**
   * Create a custom admin user
   */
  async createAdminUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error(`User with email ${email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    });

    await this.userRepository.save(user);
    this.logger.log(`✅ Created custom admin user: ${email}`);

    return user;
  }

  /**
   * Get all admin users
   */
  async getAllAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: Role.ADMIN },
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
    });
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = !user.isActive;
    await this.userRepository.save(user);

    this.logger.log(
      `🔄 User ${user.email} status changed to: ${user.isActive ? 'active' : 'inactive'}`,
    );

    return user;
  }

  /**
   * Reset user password
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    this.logger.log(`🔑 Password reset for user: ${user.email}`);
  }
}
