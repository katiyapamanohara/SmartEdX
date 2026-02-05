import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Institute } from '../../../modules/auth/entities/institute.entity';

@Injectable()
export class InstituteRepository extends BaseRepository<Institute> {
  constructor(
    @InjectRepository(Institute)
    private readonly instituteRepo: Repository<Institute>,
  ) {
    super(instituteRepo);
  }

  async findByName(name: string): Promise<Institute | null> {
    return this.instituteRepo.findOne({ where: { name } });
  }
}
