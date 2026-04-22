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

  async findPublicInfoById(
    id: string,
  ): Promise<Pick<Institute, 'id' | 'name' | 'logo' | 'phoneNumber'> | null> {
    const institute = await this.instituteRepo.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        logo: true,
        phoneNumber: true,
      },
    });

    if (!institute) {
      return null;
    }

    return {
      id: institute.id,
      name: institute.name,
      logo: institute.logo,
      phoneNumber: institute.phoneNumber,
    };
  }
}
