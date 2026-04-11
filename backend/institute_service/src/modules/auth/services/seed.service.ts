import { Injectable, Logger } from '@nestjs/common';
import { InstituteRoleRepository } from '../../../infra/database/repositories';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly instituteRoleRepository: InstituteRoleRepository,
  ) {}

  async seedAdminUsers(): Promise<void> {
    const roles = ['instructor', 'teacher', 'student'];

    for (const roleName of roles) {
      const exists = await this.instituteRoleRepository.findByName(roleName);
      if (!exists) {
        await this.instituteRoleRepository.create({
          name: roleName,
          description: `Role for ${roleName}`,
        });
        this.logger.log(`Seeded role: ${roleName}`);
      }
    }
  }
}
