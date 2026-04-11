import {
  Controller,
  All,
  Post,
  Req,
  Body,
  Headers,
  HttpException,
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

  // ── JSON: quiz generation from text/description ───────────────
  @Post('quiz/generate-from-text')
  @ApiOperation({
    summary: 'Generate quiz questions from text/description using AI',
  })
  async generateQuizFromText(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest(
      'api/quiz/generate-from-text',
      'POST',
      body,
      headers,
    );
  }

  // ── File upload: quiz generation from document ────────────────
  @Post('quiz/generate-from-file')
  @ApiOperation({
    summary:
      'Generate quiz questions from a document using AI (MCQ/essay/both)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async generateQuizFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardFileUpload(
      'api/quiz/generate-from-file',
      file,
      body,
      headers,
    );
  }

  // ── File upload: quiz generation (legacy) ─────────────────────
  @Post('quiz/generate')
  @ApiOperation({ summary: 'Generate quiz questions from a document using AI' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async generateQuiz(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardFileUpload(
      'api/quiz/generate',
      file,
      body,
      headers,
    );
  }

  // ── JSON: description generation ──────────────────────────────
  @Post('description/generate')
  @ApiOperation({ summary: 'Generate a description using AI' })
  async generateDescription(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest(
      'api/description/generate',
      'POST',
      body,
      headers,
    );
  }

  // ── JSON: institute AI assistant chat ─────────────────────────
  @Post('chat/message')
  @ApiOperation({ summary: 'Chat with the institute AI assistant' })
  async chat(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest(
      'api/chat/message',
      'POST',
      body,
      headers,
    );
  }

  // ── Multipart: voice assessment question generation ───────────
  @Post('voice-assessment/generate')
  @ApiOperation({
    summary:
      'Generate voice assessment questions from instructions and/or file',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async voiceAssessmentGenerate(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardVoiceAssessmentGenerate(
      'api/voice-assessment/generate',
      file,
      body,
      headers,
    );
  }

  // ── JSON: voice assessment answer evaluation ───────────────────
  @Post('voice-assessment/evaluate')
  @ApiOperation({
    summary: 'Evaluate student voice/text answers and return scores',
  })
  async voiceAssessmentEvaluate(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardRequest(
      'api/voice-assessment/evaluate',
      'POST',
      body,
      headers,
    );
  }

  // ── Multipart: student AI learning assistant (with optional file) ─
  @Post('student-chat/message')
  @ApiOperation({
    summary:
      'Chat with the student AI learning assistant (supports file upload)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async studentChat(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardStudentChat(
      'api/student-chat/message',
      file,
      body,
      headers,
    );
  }

  // ── Multipart: teacher AI assistant chat (with optional file) ─
  @Post('teacher-chat/message')
  @ApiOperation({
    summary: 'Chat with the teacher AI assistant (supports file upload)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async teacherChat(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardTeacherChat(
      'api/teacher-chat/message',
      file,
      body,
      headers,
    );
  }

  // ── Multipart: voice-to-text transcription ───────────────────
  @Post('transcribe')
  @ApiOperation({
    summary: 'Transcribe an audio recording to text using Gemini',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeAudio(
    @UploadedFile() audio: Express.Multer.File,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardAudioTranscription(
      'api/transcription/audio',
      audio,
      headers,
    );
  }

  // ── Face recognition: enroll from file upload ─────────────────
  @Post('face/enroll')
  @ApiOperation({
    summary: 'Enroll student face — upload image and get descriptor',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async enrollFace(
    @UploadedFile() file: Express.Multer.File,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardFaceUpload(
      'api/face/enroll',
      file,
      headers,
    );
  }

  // ── Face recognition: enroll from base64 webcam capture ───────
  @Post('face/enroll-base64')
  @ApiOperation({ summary: 'Enroll student face from base64 webcam image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('_unused', { limits: { fieldSize: 10 * 1024 * 1024 } }),
  )
  async enrollFaceBase64(@Body() body: any, @Headers() headers: any) {
    const imageB64: string | undefined = body?.image_b64;
    if (!imageB64) {
      throw new HttpException('image_b64 field is missing or empty', 400);
    }
    return this.aiProxyService.forwardFaceBase64(
      'api/face/enroll-base64',
      imageB64,
      headers,
    );
  }

  // ── Face recognition: compare two descriptors ─────────────────
  @Post('face/verify')
  @ApiOperation({
    summary: 'Verify identity by comparing two face descriptors',
  })
  async verifyFace(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardFaceJson(
      'api/face/verify',
      'POST',
      body,
      headers,
    );
  }

  // ── Face recognition: verify live image vs stored descriptor ──
  @Post('face/verify-image')
  @ApiOperation({
    summary: 'Verify identity: stored descriptor vs live webcam image',
  })
  async verifyFaceImage(@Body() body: any, @Headers() headers: any) {
    return this.aiProxyService.forwardFaceJson(
      'api/face/verify-image',
      'POST',
      body,
      headers,
    );
  }

  // ── Catch-all for everything else (health, docs, etc.) ────────
  @All('*')
  @ApiOperation({ summary: 'Proxy all other AI Core requests' })
  async proxy(@Req() req: Request, @Body() body: any, @Headers() headers: any) {
    const prefix = '/api/ai';
    let relativePath = req.originalUrl;
    if (relativePath.startsWith(prefix))
      relativePath = relativePath.slice(prefix.length);
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);

    return this.aiProxyService.forwardRequest(
      relativePath,
      req.method,
      body,
      headers,
    );
  }

  @All()
  @ApiOperation({ summary: 'Proxy root AI Core request' })
  async proxyRoot(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.aiProxyService.forwardRequest('', req.method, body, headers);
  }
}
