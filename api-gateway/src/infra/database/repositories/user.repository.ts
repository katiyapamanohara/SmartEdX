import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { User } from '../../../modules/auth/entities/user.entity';

/**
 * User Repository
 * Handles all database operations for User entity
 */
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Find active user by email
   * @param email - User email
   * @returns Active user or null if not found
   */
  async findActiveByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, isActive: true },
    });
  }

  /**
   * Find all active users
   * @returns Array of active users
   */
  async findAllActive(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
    });
  }

  /**
   * Check if email exists
   * @param email - User email
   * @returns True if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email });
  }

  /**
   * Find user by ID with relations (if needed in future)
   * @param id - User ID
   * @returns User with relations or null
   */
  async findByIdWithRelations(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      // relations: ['courses', 'quizzes'], // Add relations when needed
    });
  }

  /**
   * Deactivate user account
   * @param id - User ID
   * @returns Updated user or null
   */
  async deactivate(id: string): Promise<User | null> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate user account
   * @param id - User ID
   * @returns Updated user or null
   */
  async activate(id: string): Promise<User | null> {
    return this.update(id, { isActive: true });
  }

  /**
   * Update user password
   * @param id - User ID
   * @param hashedPassword - New hashed password
   * @returns Updated user or null
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User | null> {
    return this.update(id, { password: hashedPassword });
  }

  /**
   * Find all users excluding system admin (admin@gmail.com)
   * @returns Array of users excluding admin@gmail.com
   */
  async findAllExcludingSystemAdmin(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email != :email', { email: 'admin@gmail.com' })
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.role',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ])
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }
}
