import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Role } from '../../../modules/auth/entities/role.entity';

/**
 * Role Repository
 * Handles all database operations for Role entity
 */
@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super(roleRepository);
  }

  /**
   * Find role by name
   * @param name - Role name (e.g., 'admin', 'instructor', 'student')
   * @returns Role or null if not found
   */
  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name: name.toLowerCase() },
    });
  }

  /**
   * Find all active roles with user count
   * @returns Array of roles with user relationships
   */
  async findAllWithUsers(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: ['users'],
    });
  }

  /**
   * Check if role name exists
   * @param name - Role name
   * @returns True if role exists
   */
  async roleNameExists(name: string): Promise<boolean> {
    return this.exists({ name: name.toLowerCase() });
  }

  /**
   * Get role by name or create if not exists
   * @param name - Role name
   * @param description - Role description
   * @returns Role entity
   */
  async findOrCreate(name: string, description?: string): Promise<Role> {
    let role = await this.findByName(name);

    if (!role) {
      role = await this.create({
        name: name.toLowerCase(),
        description,
      });
    }

    return role;
  }
}
