import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ExamRepository } from '../../infra/database/repositories/exam.repository';
import { CourseRepository } from '../../infra/database/repositories/course.repository';
import { StudentRepository } from '../../infra/database/repositories/student.repository';
import { InstituteUserRepository } from '../../infra/database/repositories/institute-user.repository';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { Exam, ExamAttempt, ExamStatus, IntegrityFlag, IntegrityViolationType } from './entities/exam.entity'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { randomUUID } from 'crypto';

const SEVERITY_MAP: Record<IntegrityViolationType, IntegrityFlag['severity']> = {
  face_absent: 'high',
  face_verify_failed: 'high',
  multiple_faces: 'high',
  tab_switch: 'medium',
  camera_disabled: 'medium',
  fullscreen_exit: 'low',
};

@Injectable()
export class ExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly studentRepository: StudentRepository,
    private readonly instituteUserRepository: InstituteUserRepository,
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
      maxAttempts: exam.maxAttempts ?? 1,
      requireFaceId: exam.requireFaceId ?? false,
      totalMarks,
      questionCount: exam.questions.length,
      questions,
      createdByUserId: exam.createdByUserId,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      ...(attempt !== undefined ? { myAttempt: attempt } : {}),
      // Include all student attempts for teacher/admin views (no specific userId)
      ...(userId === undefined ? { studentAttempts: exam.studentAttempts ?? {} } : {}),
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
      maxAttempts: dto.maxAttempts ?? 1,
      requireFaceId: dto.requireFaceId ?? false,
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

    const maxAttempts = exam.maxAttempts ?? 1;
    const prevAttempt = exam.studentAttempts?.[userId];
    const usedAttempts: number = prevAttempt?.attemptCount ?? (prevAttempt ? 1 : 0);
    if (usedAttempts >= maxAttempts) {
      throw new BadRequestException(`Maximum attempts (${maxAttempts}) reached for this exam`);
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

    const attempt: ExamAttempt & { attemptCount: number } = {
      answers: dto.answers,
      score,
      totalMarks,
      passed,
      submittedAt: new Date().toISOString(),
      pendingEssayReview: hasPendingEssay,
      attemptCount: usedAttempts + 1,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Integrity flags
  // ─────────────────────────────────────────────────────────────────────────────

  async reportIntegrityFlag(
    instituteId: string,
    examId: string,
    userId: string,
    type: IntegrityViolationType,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');

    const flag: IntegrityFlag = {
      id: randomUUID(),
      type,
      severity: SEVERITY_MAP[type] ?? 'medium',
      timestamp: new Date().toISOString(),
      reviewed: false,
    };

    const existing = exam.integrityFlags ?? {};
    const userFlags = existing[userId] ?? [];
    const updated = { ...existing, [userId]: [...userFlags, flag] };
    await this.examRepository.update(examId, { integrityFlags: updated } as any);
    return { success: true, flag };
  }

  async getIntegrityFlagsForTeacher(instituteId: string, teacherUserId: string) {
    const exams = await this.examRepository.findByCreator(teacherUserId, instituteId);

    const userIdSet = new Set<string>();
    for (const exam of exams) {
      for (const uid of Object.keys(exam.integrityFlags ?? {})) userIdSet.add(uid);
    }

    const nameMap = new Map<string, string>();
    for (const uid of userIdSet) {
      const user = await this.instituteUserRepository.findById(uid);
      if (user) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        nameMap.set(uid, name);
      }
    }

    const rows: {
      flagId: string;
      examId: string;
      examTitle: string;
      userId: string;
      studentName: string;
      type: string;
      severity: string;
      timestamp: string;
      reviewed: boolean;
    }[] = [];

    for (const exam of exams) {
      for (const [uid, flags] of Object.entries(exam.integrityFlags ?? {})) {
        for (const flag of flags) {
          rows.push({
            flagId: flag.id,
            examId: exam.id,
            examTitle: exam.title,
            userId: uid,
            studentName: nameMap.get(uid) ?? uid,
            type: flag.type,
            severity: flag.severity,
            timestamp: flag.timestamp,
            reviewed: flag.reviewed,
          });
        }
      }
    }

    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return rows;
  }

  async markFlagReviewed(
    instituteId: string,
    examId: string,
    userId: string,
    flagId: string,
    teacherUserId: string,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.createdByUserId !== teacherUserId) throw new ForbiddenException('Not your exam');

    const flags = exam.integrityFlags?.[userId] ?? [];
    const updatedFlags = flags.map((f) => (f.id === flagId ? { ...f, reviewed: true } : f));
    await this.examRepository.update(examId, {
      integrityFlags: { ...exam.integrityFlags, [userId]: updatedFlags },
    } as any);
    return { success: true };
  }
}
