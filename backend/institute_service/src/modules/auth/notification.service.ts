import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NotificationRepository } from '../../infra/database/repositories/notification.repository';
import { NotificationGateway } from './notification.gateway';
import { NotificationType } from './entities/notification.entity';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /** Create and immediately push a notification via WebSocket. */
  async create(
    userId: string,
    instituteId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.notificationRepository.create({
      userId,
      instituteId,
      type,
      title,
      body,
      metadata: metadata ?? null,
      isRead: false,
    });

    this.notificationGateway.emitNotification(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      isRead: false,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  /** Called by MessageService when a new message arrives for a teacher. */
  async notifyNewMessage(
    recipientId: string,
    instituteId: string,
    senderName: string,
    preview: string,
    senderId: string,
    messageId: string,
  ) {
    return this.create(
      recipientId,
      instituteId,
      'message',
      `New message from ${senderName}`,
      preview.length > 100 ? preview.slice(0, 97) + '...' : preview,
      { senderId, messageId },
    );
  }

  /** Create a reminder notification for a teacher. */
  async createReminder(
    userId: string,
    instituteId: string,
    dto: CreateReminderDto,
  ) {
    return this.create(
      userId,
      instituteId,
      'reminder',
      dto.title,
      dto.body,
      dto.scheduledAt ? { scheduledAt: dto.scheduledAt } : undefined,
    );
  }

  async getNotifications(userId: string, instituteId: string) {
    const notifications = await this.notificationRepository.findByUser(
      userId,
      instituteId,
    );
    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      metadata: n.metadata,
      createdAt: n.createdAt,
    }));
  }

  async getUnreadCount(userId: string, instituteId: string) {
    const count = await this.notificationRepository.countUnread(
      userId,
      instituteId,
    );
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationRepository.markOneRead(notificationId, userId);
    return { success: true };
  }

  async markAllAsRead(userId: string, instituteId: string) {
    await this.notificationRepository.markAllRead(userId, instituteId);
    return { success: true };
  }
}
