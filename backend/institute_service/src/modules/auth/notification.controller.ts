import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('institutes/:id/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getNotifications(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationService.getNotifications(userId, instituteId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getUnreadCount(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationService.getUnreadCount(userId, instituteId);
  }

  @Post('reminders')
  @ApiOperation({ summary: 'Create a reminder notification for yourself' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  createReminder(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.notificationService.createReminder(userId, instituteId, dto);
  }

  @Patch(':notifId/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'notifId', description: 'Notification ID' })
  markAsRead(
    @Param('notifId') notifId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationService.markAsRead(notifId, userId);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  markAllAsRead(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationService.markAllAsRead(userId, instituteId);
  }
}
