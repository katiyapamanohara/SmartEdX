import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Messages')
@Controller('institutes/:id/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'Get list of contactable users (teachers for students, students for teachers)' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getContacts(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messageService.getContacts(instituteId, userId, role);
  }

  @Get('conversation/:otherUserId')
  @ApiOperation({ summary: 'Get conversation messages with a specific user' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'otherUserId', description: 'Other user ID' })
  async getConversation(
    @Param('id') instituteId: string,
    @Param('otherUserId') otherUserId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messageService.getConversation(instituteId, userId, otherUserId, role);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message to another user' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async sendMessage(
    @Param('id') instituteId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messageService.sendMessage(instituteId, userId, dto, role);
  }

  @Get('unread-counts')
  @ApiOperation({ summary: 'Get unread message counts per contact' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getUnreadCounts(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messageService.getUnreadCounts(instituteId, userId);
  }
}
