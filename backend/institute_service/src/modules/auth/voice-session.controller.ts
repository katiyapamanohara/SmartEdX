import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { Public } from '../../core/decorators/public.decorator';

class StartVoiceSessionDto {
  @IsString()
  sip_session_id: string;

  @IsString()
  institute_id: string;

  @IsString()
  @IsOptional()
  sip_caller_id?: string;

  @IsObject()
  @IsOptional()
  meta_data?: Record<string, any>;
}

class EndVoiceSessionDto {
  @IsString()
  session_id: string;

  @IsArray()
  @IsOptional()
  chat_history?: any[];
}

@ApiTags('Voice Sessions')
@Controller('api/session/voice')
export class VoiceSessionController {
  private readonly logger = new Logger(VoiceSessionController.name);
  private readonly activeSessions = new Map<string, { institute_id: string; started_at: Date; meta_data?: Record<string, any> }>();

  @Public()
  @Post('start')
  @ApiOperation({ summary: 'Start a voice agent session' })
  @ApiBody({ type: StartVoiceSessionDto })
  @ApiResponse({ status: 201, description: 'Voice session started' })
  startSession(@Body() dto: StartVoiceSessionDto) {
    this.activeSessions.set(dto.sip_session_id, {
      institute_id: dto.institute_id,
      started_at: new Date(),
      meta_data: dto.meta_data,
    });
    this.logger.log(`Voice session started: ${dto.sip_session_id} (institute: ${dto.institute_id}, type: ${dto.meta_data?.type ?? 'unknown'})`);
    return { session_id: dto.sip_session_id, status: 'started' };
  }

  @Public()
  @Post('end')
  @ApiOperation({ summary: 'End a voice agent session' })
  @ApiBody({ type: EndVoiceSessionDto })
  @ApiResponse({ status: 200, description: 'Voice session ended' })
  endSession(@Body() dto: EndVoiceSessionDto) {
    const session = this.activeSessions.get(dto.session_id);
    if (session) {
      const duration = Math.round((Date.now() - session.started_at.getTime()) / 1000);
      this.logger.log(`Voice session ended: ${dto.session_id} (duration: ${duration}s, turns: ${dto.chat_history?.length ?? 0})`);
      this.activeSessions.delete(dto.session_id);
    } else {
      this.logger.warn(`Voice session end received for unknown session: ${dto.session_id}`);
    }
    return { session_id: dto.session_id, status: 'ended' };
  }
}
