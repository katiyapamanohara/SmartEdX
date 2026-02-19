import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { InstituteRole } from '../../../modules/auth/entities/institute-role.entity';

@Injectable()
export class InstituteRoleRepository extends BaseRepository<InstituteRole> {
  constructor(
    @InjectRepository(InstituteRole)
    private readonly instituteRoleRepository: Repository<InstituteRole>,
  ) {
    super(instituteRoleRepository);
  }

  async findByName(name: string): Promise<InstituteRole | null> {
    return this.instituteRoleRepository.findOne({
      where: { name },
    });
  }
}
