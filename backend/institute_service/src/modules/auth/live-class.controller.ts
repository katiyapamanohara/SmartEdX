import {
  Controller,
  Get,
  Post,
  Delete,
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
import { LiveClassService } from './live-class.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Live Classes')
@Controller('institutes/:id/live-classes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LiveClassController {
  constructor(private readonly liveClassService: LiveClassService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sessions for the institute (students)' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getStudentSessions(@Param('id') instituteId: string) {
    return this.liveClassService.getStudentSessions(instituteId);
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Get teacher own sessions' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getTeacherSessions(
    @Param('id') instituteId: string,
    @CurrentUser('userId') teacherId: string,
  ) {
    return this.liveClassService.getTeacherSessions(teacherId, instituteId);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session details' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.liveClassService.getSession(sessionId);
  }

  @Get(':sessionId/participants')
  @ApiOperation({ summary: 'Get active participants in session' })
  async getParticipants(@Param('sessionId') sessionId: string) {
    return this.liveClassService.getSessionParticipants(sessionId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new live session (teacher)' })
  async createSession(
    @Param('id') instituteId: string,
    @CurrentUser('userId') teacherId: string,
    @Body() dto: CreateLiveSessionDto,
  ) {
    return this.liveClassService.createSession(instituteId, teacherId, dto);
  }

  @Post(':sessionId/start')
  @ApiOperation({ summary: 'Start a scheduled session (teacher)' })
  async startSession(
    @Param('id') instituteId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') teacherId: string,
  ) {
    return this.liveClassService.startSession(
      sessionId,
      teacherId,
      instituteId,
    );
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a live session (teacher)' })
  async endSession(
    @Param('id') instituteId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') teacherId: string,
  ) {
    return this.liveClassService.endSession(sessionId, teacherId, instituteId);
  }

  @Post(':sessionId/join')
  @ApiOperation({ summary: 'Join a session (student)' })
  async joinSession(
    @Param('id') instituteId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.liveClassService.joinSession(sessionId, userId, instituteId);
  }

  @Post(':sessionId/leave')
  @ApiOperation({ summary: 'Leave a session' })
  async leaveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.liveClassService.leaveSession(sessionId, userId);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Delete a scheduled session (teacher)' })
  async deleteSession(
    @Param('id') instituteId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') teacherId: string,
  ) {
    return this.liveClassService.deleteSession(
      sessionId,
      teacherId,
      instituteId,
    );
  }
}
