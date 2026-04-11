import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import {
  LiveSession,
  LiveSessionStatus,
} from '../../../modules/auth/entities/live-session.entity';

@Injectable()
export class LiveSessionRepository extends BaseRepository<LiveSession> {
  constructor(
    @InjectRepository(LiveSession)
    private readonly liveSessionRepository: Repository<LiveSession>,
  ) {
    super(liveSessionRepository);
  }

  async findByInstitute(instituteId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository.find({
      where: { instituteId },
      relations: ['teacher'],
      order: { scheduledAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByTeacher(
    teacherId: string,
    instituteId: string,
  ): Promise<LiveSession[]> {
    return this.liveSessionRepository.find({
      where: { teacherId, instituteId },
      relations: ['teacher'],
      order: { scheduledAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findLiveAndScheduled(instituteId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .where('session.instituteId = :instituteId', { instituteId })
      .andWhere('session.status IN (:...statuses)', {
        statuses: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE],
      })
      .orderBy('session.scheduledAt', 'ASC')
      .getMany();
  }

  async findWithDetails(sessionId: string): Promise<LiveSession | null> {
    return this.liveSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['teacher'],
    });
  }
}
