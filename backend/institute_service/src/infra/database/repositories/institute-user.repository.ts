import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { InstituteUser } from '../../../modules/auth/entities/institute-user.entity';

@Injectable()
export class InstituteUserRepository extends BaseRepository<InstituteUser> {
  constructor(
    @InjectRepository(InstituteUser)
    private readonly instituteUserRepository: Repository<InstituteUser>,
  ) {
    super(instituteUserRepository);
  }

  async findByInstituteId(instituteId: string): Promise<InstituteUser[]> {
    return this.instituteUserRepository.find({
      where: { instituteId },
      relations: ['role'],
    });
  }

  async findByEmail(email: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { email },
      relations: ['role', 'institute'],
    });
  }

  async findByEmailAndInstituteId(email: string, instituteId: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { email, instituteId },
      relations: ['role', 'institute'],
    });
  }

  async findById(id: string): Promise<InstituteUser | null> {
    return this.instituteUserRepository.findOne({
      where: { id },
      relations: ['role', 'institute'],
    });
  }
}
