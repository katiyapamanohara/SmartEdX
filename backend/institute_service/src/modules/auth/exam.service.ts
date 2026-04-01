import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ExamRepository } from '../../infra/database/repositories/exam.repository';
import { CourseRepository } from '../../infra/database/repositories/course.repository';
import { StudentRepository } from '../../infra/database/repositories/student.repository';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { Exam, ExamAttempt, ExamStatus } from './entities/exam.entity';

@Injectable()
export class ExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly studentRepository: StudentRepository,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private computeStatus(exam: Exam): ExamStatus {
    if (exam.status === 'draft') return 'draft';
    if (!exam.scheduledAt) return exam.status;
    const now = Date.now();
    const start = new Date(exam.scheduledAt).getTime();
    const end = start + exam.durationMinutes * 60_000;
    if (now < start) return 'scheduled';
    if (now < end) return 'active';
    return 'completed';
  }

  private formatExam(exam: Exam, userId?: string) {
    const status = this.computeStatus(exam);
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    const attempt = userId ? (exam.studentAttempts?.[userId] ?? null) : undefined;
    // Strip correct answers + sample answers for active exams (student safety)
    const questions =
      status === 'active' && userId
        ? exam.questions.map(({ correctAnswer: _c, explanation: _e, sampleAnswer: _s, ...q }) => q)
        : exam.questions;

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      courseId: exam.courseId,
      courseName: (exam.course as any)?.name,
      scheduledAt: exam.scheduledAt,
      durationMinutes: exam.durationMinutes,
      status,
      passingScore: exam.passingScore,
      totalMarks,
      questionCount: exam.questions.length,
      questions,
      createdByUserId: exam.createdByUserId,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      ...(attempt !== undefined ? { myAttempt: attempt } : {}),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Teacher / Institute
  // ─────────────────────────────────────────────────────────────────────────────

  async create(instituteId: string, userId: string, role: string, dto: CreateExamDto) {
    // Verify teacher owns the course (skip check for institute admins)
    if (role === 'teacher' || role === 'instructor') {
      const courses = await this.courseRepository.findByTeacherUserId(userId, instituteId);
      if (!courses.some((c) => c.id === dto.courseId)) {
        throw new ForbiddenException('You are not assigned to this course');
      }
    } else {
      // Institute role — verify course belongs to institute
      const course = await this.courseRepository.findOne({
        where: { id: dto.courseId, instituteId },
      });
      if (!course) throw new NotFoundException('Course not found');
    }

    const status: ExamStatus = dto.scheduledAt ? 'scheduled' : 'draft';

    const exam = await this.examRepository.create({
      title: dto.title,
      description: dto.description,
      instructions: dto.instructions,
      courseId: dto.courseId,
      instituteId,
      createdByUserId: userId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      durationMinutes: dto.durationMinutes,
      passingScore: dto.passingScore,
      questions: dto.questions as any,
      status,
      studentAttempts: {},
    });

    return this.formatExam(exam);
  }

  async update(instituteId: string, examId: string, userId: string, role: string, dto: UpdateExamDto) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');

    if (role !== 'admin' && exam.createdByUserId !== userId) {
      throw new ForbiddenException('You can only edit your own exams');
    }

    const patch: Partial<Exam> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.instructions !== undefined) patch.instructions = dto.instructions;
    if (dto.scheduledAt !== undefined) patch.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMinutes !== undefined) patch.durationMinutes = dto.durationMinutes;
    if (dto.passingScore !== undefined) patch.passingScore = dto.passingScore;
    if (dto.questions !== undefined) patch.questions = dto.questions as any;
    if (dto.status !== undefined) patch.status = dto.status as ExamStatus;
    if (dto.courseId !== undefined) patch.courseId = dto.courseId;

    // Auto-set status when scheduledAt is provided
    if (dto.scheduledAt && !dto.status) {
      patch.status = 'scheduled';
    }

    const updated = await this.examRepository.update(examId, patch);
    return this.formatExam(updated!);
  }

  async remove(instituteId: string, examId: string, userId: string, role: string) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');

    if (role !== 'admin' && exam.createdByUserId !== userId) {
      throw new ForbiddenException('You can only delete your own exams');
    }

    await this.examRepository.delete(examId);
    return { success: true };
  }

  async getForTeacher(instituteId: string, userId: string) {
    const exams = await this.examRepository.findByCreator(userId, instituteId);
    return exams.map((e) => this.formatExam(e));
  }

  async getForInstitute(instituteId: string) {
    const exams = await this.examRepository.findByInstitute(instituteId);
    return exams.map((e) => this.formatExam(e));
  }

  async getOne(instituteId: string, examId: string) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');
    return this.formatExam(exam);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Student
  // ─────────────────────────────────────────────────────────────────────────────

  async getForStudent(instituteId: string, userId: string) {
    // Get enrolled courses
    const student = await this.studentRepository.findOne({
      where: { userId, instituteId },
      relations: ['courses'],
    });
    if (!student) return [];

    const courseIds = (student.courses ?? []).map((c) => c.id);
    const exams = await this.examRepository.findByCourseIds(courseIds, instituteId);
    return exams.map((e) => this.formatExam(e, userId));
  }

  async submitExam(instituteId: string, examId: string, userId: string, dto: SubmitExamDto) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');

    const status = this.computeStatus(exam);
    if (status !== 'active') {
      throw new BadRequestException('Exam is not currently active');
    }

    if (exam.studentAttempts?.[userId]) {
      throw new BadRequestException('You have already submitted this exam');
    }

    // Score calculation (MCQ auto-graded, essay pending review)
    let score = 0;
    let hasPendingEssay = false;
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    for (const q of exam.questions) {
      if (q.type === 'essay' || !q.type) {
        // Essay answers stored as text; score pending teacher review
        if (dto.answers[q.id] !== undefined && dto.answers[q.id] !== '') {
          hasPendingEssay = true;
        }
      } else if (dto.answers[q.id] === q.correctAnswer) {
        score += q.marks;
      }
    }

    // For mixed exams: MCQ portion graded, essay portion pending
    const mcqTotal = exam.questions
      .filter((q) => q.type === 'mcq' || (q.type !== 'essay' && q.options))
      .reduce((s, q) => s + q.marks, 0);
    const percentage = mcqTotal > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = !hasPendingEssay && percentage >= exam.passingScore;

    const attempt: ExamAttempt = {
      answers: dto.answers,
      score,
      totalMarks,
      passed,
      submittedAt: new Date().toISOString(),
      pendingEssayReview: hasPendingEssay,
    };

    const updatedAttempts = { ...(exam.studentAttempts ?? {}), [userId]: attempt };
    await this.examRepository.update(examId, { studentAttempts: updatedAttempts });

    return {
      score,
      totalMarks,
      percentage,
      passed,
      passingScore: exam.passingScore,
    };
  }
}
