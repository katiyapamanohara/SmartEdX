import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LiveParticipant } from '../../../modules/auth/entities/live-participant.entity';

@Injectable()
export class LiveParticipantRepository extends BaseRepository<LiveParticipant> {
  constructor(
    @InjectRepository(LiveParticipant)
    private readonly liveParticipantRepository: Repository<LiveParticipant>,
  ) {
    super(liveParticipantRepository);
  }

  async findBySession(sessionId: string): Promise<LiveParticipant[]> {
    return this.liveParticipantRepository.find({
      where: { sessionId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async findActiveBySession(sessionId: string): Promise<LiveParticipant[]> {
    return this.liveParticipantRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .where('p.sessionId = :sessionId', { sessionId })
      .andWhere('p.leftAt IS NULL')
      .getMany();
  }

  async upsertParticipant(
    sessionId: string,
    userId: string,
    instituteId: string,
  ): Promise<LiveParticipant> {
    let participant = await this.liveParticipantRepository.findOne({
      where: { sessionId, userId },
    });
    if (!participant) {
      participant = this.liveParticipantRepository.create({
        sessionId,
        userId,
        instituteId,
        joinedAt: new Date(),
      });
    } else {
      participant.joinedAt = new Date();
      participant.leftAt = null as any;
    }
    return this.liveParticipantRepository.save(participant);
  }

  async markLeft(sessionId: string, userId: string): Promise<void> {
    await this.liveParticipantRepository
      .createQueryBuilder()
      .update(LiveParticipant)
      .set({ leftAt: new Date() })
      .where('sessionId = :sessionId', { sessionId })
      .andWhere('userId = :userId', { userId })
      .andWhere('leftAt IS NULL')
      .execute();
  }

  async countActive(sessionId: string): Promise<number> {
    return this.liveParticipantRepository.count({
      where: { sessionId, leftAt: undefined },
    });
  }
}
