import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Notification } from '../../../modules/auth/entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {
    super(notifRepo);
  }

  findByUser(userId: string, instituteId: string, limit = 50): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId, instituteId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  countUnread(userId: string, instituteId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, instituteId, isRead: false } });
  }

  async markOneRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string, instituteId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .andWhere('instituteId = :instituteId', { instituteId })
      .andWhere('isRead = false')
      .execute();
  }
}
