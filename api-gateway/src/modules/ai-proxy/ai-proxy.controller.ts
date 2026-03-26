import {
  Controller,
  All,
  Post,
  Req,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { Request } from 'express';

@ApiTags('AI Core')
@Controller('api/ai')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  // ── File upload: quiz generation ──────────────────────────────
  @Post('quiz/generate')
  @ApiOperation({ summary: 'Generate quiz questions from a document using AI' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async generateQuiz(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardFileUpload('api/quiz/generate', file, body, headers);
  }

  // ── JSON: description generation ──────────────────────────────
  @Post('description/generate')
  @ApiOperation({ summary: 'Generate a description using AI' })
  async generateDescription(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest('api/description/generate', 'POST', body, headers);
  }

  // ── JSON: institute AI assistant chat ─────────────────────────
  @Post('chat/message')
  @ApiOperation({ summary: 'Chat with the institute AI assistant' })
  async chat(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest('api/chat/message', 'POST', body, headers);
  }

  // ── Multipart: teacher AI assistant chat (with optional file) ─
  @Post('teacher-chat/message')
  @ApiOperation({ summary: 'Chat with the teacher AI assistant (supports file upload)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async teacherChat(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardTeacherChat('api/teacher-chat/message', file, body, headers);
  }

  // ── Catch-all for everything else (health, docs, etc.) ────────
  @All('*')
  @ApiOperation({ summary: 'Proxy all other AI Core requests' })
  async proxy(@Req() req: Request, @Body() body: any, @Headers() headers: any) {
    const prefix = '/api/ai';
    let relativePath = req.originalUrl;
    if (relativePath.startsWith(prefix)) relativePath = relativePath.slice(prefix.length);
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);

    return this.aiProxyService.forwardRequest(relativePath, req.method, body, headers);
  }

  @All()
  @ApiOperation({ summary: 'Proxy root AI Core request' })
  async proxyRoot(@Req() req: Request, @Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest('', req.method, body, headers);
  }
}
