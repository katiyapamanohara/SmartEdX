import { Injectable, Logger } from '@nestjs/common';
import { InstituteRoleRepository } from '../../../infra/database/repositories';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly instituteRoleRepository: InstituteRoleRepository,
  ) {}

  async seedAdminUsers(): Promise<void> {
     // Previously seeded global admin users. Now redundant or needs to be adapted for Institute Roles?
     // For now, doing nothing to allow application start.
     this.logger.log('Seed service invalid for global users. Skipping.');
  }
}
