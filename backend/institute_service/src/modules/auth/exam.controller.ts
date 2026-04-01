import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
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

  @Get(':examId')
  @ApiOperation({ summary: 'Get a single exam by ID' })
  getOne(
    @Param('id') instituteId: string,
    @Param('examId') examId: string,
  ) {
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
