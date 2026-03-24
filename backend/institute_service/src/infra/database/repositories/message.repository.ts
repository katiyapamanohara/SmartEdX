import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Message } from '../../../modules/auth/entities/message.entity';

@Injectable()
export class MessageRepository extends BaseRepository<Message> {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {
    super(messageRepository);
  }

  async findConversation(
    userId1: string,
    userId2: string,
    instituteId: string,
  ): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where('message.instituteId = :instituteId', { instituteId })
      .andWhere(
        '(message.senderId = :userId1 AND message.recipientId = :userId2) OR (message.senderId = :userId2 AND message.recipientId = :userId1)',
        { userId1, userId2 },
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }

  async markAsRead(senderId: string, recipientId: string, instituteId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('senderId = :senderId', { senderId })
      .andWhere('recipientId = :recipientId', { recipientId })
      .andWhere('instituteId = :instituteId', { instituteId })
      .andWhere('isRead = false')
      .execute();
  }

  async getUnreadCount(recipientId: string, senderId: string, instituteId: string): Promise<number> {
    return this.messageRepository.count({
      where: { recipientId, senderId, isRead: false, instituteId },
    });
  }

  async getLastMessage(userId1: string, userId2: string, instituteId: string): Promise<Message | null> {
    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.instituteId = :instituteId', { instituteId })
      .andWhere(
        '(message.senderId = :userId1 AND message.recipientId = :userId2) OR (message.senderId = :userId2 AND message.recipientId = :userId1)',
        { userId1, userId2 },
      )
      .orderBy('message.createdAt', 'DESC')
      .getOne();
  }
}
