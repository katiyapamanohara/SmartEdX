import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Exams')
@Controller('institutes/:id/exams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  // ── Teacher / Institute ───────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create an exam (teacher or institute admin)' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  create(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateExamDto,
  ) {
    return this.examService.create(instituteId, userId, role, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Teacher: get exams created by me' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getMyExams(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.examService.getForTeacher(instituteId, userId);
  }

  @Get('institute')
  @ApiOperation({ summary: 'Institute admin: get all exams in institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getAllForInstitute(@Param('id') instituteId: string) {
    return this.examService.getForInstitute(instituteId);
  }

  @Get('student')
  @ApiOperation({ summary: 'Student: get exams from enrolled courses' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getStudentExams(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.examService.getForStudent(instituteId, userId);
  }

  // ── Integrity ─────────────────────────────────────────────────────────────
  // IMPORTANT: all static-segment routes (/integrity-flags, etc.) MUST be
  // declared before the wildcard /:examId route, otherwise NestJS matches
  // "integrity-flags" as an examId and these endpoints become unreachable.

  @Get('integrity-flags')
  @ApiOperation({ summary: 'Teacher: get all integrity flags across my exams' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getIntegrityFlags(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.examService.getIntegrityFlagsForTeacher(instituteId, userId);
  }

  @Get(':examId')
  @ApiOperation({ summary: 'Get a single exam by ID' })
  getOne(@Param('id') instituteId: string, @Param('examId') examId: string) {
    return this.examService.getOne(instituteId, examId);
  }

  @Patch(':examId')
  @ApiOperation({ summary: 'Update exam (creator or admin)' })
  update(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.update(instituteId, examId, userId, role, dto);
  }

  @Delete(':examId')
  @ApiOperation({ summary: 'Delete exam (creator or admin)' })
  remove(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.examService.remove(instituteId, examId, userId, role);
  }

  @Post(':examId/force-auto-fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student: persist a client-side auto-fail to the backend (e.g. 10-second countdown expired)',
  })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  forceAutoFail(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.examService.forceAutoFail(
      instituteId,
      examId,
      userId,
      body.reason ?? 'Student left the exam window',
    );
  }

  @Post(':examId/integrity-flag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student: report an integrity violation during exam',
  })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  reportIntegrityFlag(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { type: string },
  ) {
    return this.examService.reportIntegrityFlag(
      instituteId,
      examId,
      userId,
      body.type as any,
    );
  }

  @Patch(':examId/integrity-flag/:flagId/reviewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher: mark an integrity flag as reviewed' })
  markFlagReviewed(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @Param('flagId') flagId: string,
    @CurrentUser('userId') teacherUserId: string,
    @Body() body: { userId: string },
  ) {
    return this.examService.markFlagReviewed(
      instituteId,
      examId,
      body.userId,
      flagId,
      teacherUserId,
    );
  }

  // ── Essay grading ─────────────────────────────────────────────────────────

  @Patch(':examId/grade-essay/:studentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Teacher: save AI-generated essay grade for a student',
  })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student user ID' })
  saveEssayGrade(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
    @CurrentUser('userId') teacherUserId: string,
    @Body() body: { questionId: string; score: number; feedback: string },
  ) {
    return this.examService.saveEssayGrade(
      instituteId,
      examId,
      studentId,
      teacherUserId,
      body,
    );
  }

  // ── Screen content check ─────────────────────────────────────────────────

  @Post(':examId/screen-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student: periodic screen share analysis for cheating detection',
  })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  screenCheck(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { image_b64: string },
  ) {
    return this.examService.screenCheck(
      instituteId,
      examId,
      userId,
      body.image_b64,
    );
  }

  // ── Student ───────────────────────────────────────────────────────────────

  @Post(':examId/submit')
  @ApiOperation({ summary: 'Student: submit exam answers' })
  submit(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.examService.submitExam(instituteId, examId, userId, dto);
  }
}
