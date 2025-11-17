import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRepository, RoleRepository } from '../../../infra/database/repositories';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  /**
   * Seed default admin users if they don't exist
   */
  async seedAdminUsers(): Promise<void> {
    try {
      // Get roles
      const adminRole = await this.roleRepository.findByName('admin');
      const instructorRole = await this.roleRepository.findByName('instructor');

      if (!adminRole || !instructorRole) {
        this.logger.error('Roles not found. Please run migrations first.');
        return;
      }

      const adminUsers = [
        {
          firstName: 'System',
          lastName: 'Administrator',
          email: 'admin@gmail.com',
          password: 'Admin@123',
          roleId: adminRole.id,
        },
        {
          firstName: 'John',
          lastName: 'Instructor',
          email: 'instructor@gmail.com',
          password: 'Instructor@123',
          roleId: instructorRole.id,
        },
      ];

      for (const userData of adminUsers) {
        const existingUser = await this.userRepository.findByEmail(
          userData.email,
        );

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await this.userRepository.create({
            ...userData,
            password: hashedPassword,
            isActive: true,
          });

          const roleName = userData.roleId === adminRole.id ? 'admin' : 'instructor';
          this.logger.log(`✅ Created ${roleName} user: ${userData.email}`);
        } else {
          const roleName = userData.roleId === adminRole.id ? 'admin' : 'instructor';
          this.logger.log(
            `ℹ️  ${roleName} user already exists: ${userData.email}`,
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
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error(`User with email ${email} already exists`);
    }

    const adminRole = await this.roleRepository.findByName('admin');
    if (!adminRole) {
      throw new Error('Admin role not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    });

    this.logger.log(`✅ Created custom admin user: ${email}`);

    return user;
  }

  /**
   * Get all admin users
   */
  async getAllAdmins(): Promise<User[]> {
    const adminRole = await this.roleRepository.findByName('admin');
    if (!adminRole) {
      return [];
    }

    return this.userRepository.findAll({
      where: { roleId: adminRole.id },
      select: ['id', 'firstName', 'lastName', 'email', 'roleId', 'isActive'],
      relations: ['role'],
    });
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isActive = !user.isActive;
    const updatedUser = await this.userRepository.update(userId, { isActive });

    this.logger.log(
      `🔄 User ${user.email} status changed to: ${isActive ? 'active' : 'inactive'}`,
    );

    return updatedUser!;
  }

  /**
   * Reset user password
   * Only allows resetting password for admin and instructor roles
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const studentRole = await this.roleRepository.findByName('student');
    if (studentRole && user.roleId === studentRole.id) {
      throw new Error('Cannot reset password for student accounts');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedPassword);

    this.logger.log(`🔑 Password reset for user: ${user.email}`);
  }
}
