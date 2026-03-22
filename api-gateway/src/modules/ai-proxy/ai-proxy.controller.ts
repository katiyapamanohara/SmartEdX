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
