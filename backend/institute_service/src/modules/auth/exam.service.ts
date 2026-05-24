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
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { FaceRecClient } from '../../infra/http/face-rec.client';
import { AiCoreClient } from '../../infra/http/ai-core.client';
import { NotificationGateway } from './notification.gateway';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import {
  Exam,
  ExamAttempt,
  EssayGrade,
  ExamStatus,
  IntegrityFlag,
  IntegrityViolationType,
} from './entities/exam.entity';
import { randomUUID } from 'crypto';

const HIGH_VIOLATION_THRESHOLD = 3;

const SEVERITY_MAP: Record<IntegrityViolationType, IntegrityFlag['severity']> =
  {
    screen_share_disabled: 'high',
    suspicious_screen: 'high',
    copy_attempt: 'high',
    tab_switch: 'high',
    fullscreen_exit: 'medium',
  };

@Injectable()
export class ExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly studentRepository: StudentRepository,
    private readonly instituteUserRepository: InstituteUserRepository,
    private readonly faceRecClient: FaceRecClient,
    private readonly aiCoreClient: AiCoreClient,
    private readonly notificationGateway: NotificationGateway,
    private readonly moduleContentRepository: ModuleContentRepository,
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
    const attempt = userId
      ? (exam.studentAttempts?.[userId] ?? null)
      : undefined;
    // Strip correct answers + sample answers for active exams (student safety),
    // but only when the student has NOT yet submitted — after submission they
    // need correctAnswer to power the "Areas to Improve" feedback on the
    // performance page.
    const hasSubmitted = attempt !== null && attempt !== undefined;
    const questions =
      status === 'active' && userId && !hasSubmitted
        ? exam.questions.map(
            ({ correctAnswer: _c, explanation: _e, sampleAnswer: _s, ...q }) =>
              q,
          )
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
      requireScreenShare: exam.requireScreenShare ?? false,
      autoFailOnCheat: exam.autoFailOnCheat ?? false,
      totalMarks,
      questionCount: exam.questions.length,
      questions,
      createdByUserId: exam.createdByUserId,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      ...(attempt !== undefined ? { myAttempt: attempt } : {}),
      // Include all student attempts for teacher/admin views (no specific userId)
      ...(userId === undefined
        ? { studentAttempts: exam.studentAttempts ?? {} }
        : {}),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Teacher / Institute
  // ─────────────────────────────────────────────────────────────────────────────

  async create(
    instituteId: string,
    userId: string,
    role: string,
    dto: CreateExamDto,
  ) {
    // Verify teacher owns the course (skip check for institute admins)
    if (role === 'teacher' || role === 'instructor') {
      const courses = await this.courseRepository.findByTeacherUserId(
        userId,
        instituteId,
      );
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

    const status: ExamStatus = (dto.status as ExamStatus) ?? (dto.scheduledAt ? 'scheduled' : 'draft');

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
      requireScreenShare: dto.requireScreenShare ?? false,
      autoFailOnCheat: dto.autoFailOnCheat ?? false,
      questions: dto.questions as any,
      status,
      studentAttempts: {},
    });

    return this.formatExam(exam);
  }

  async update(
    instituteId: string,
    examId: string,
    userId: string,
    role: string,
    dto: UpdateExamDto,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    if (role !== 'admin' && exam.createdByUserId !== userId) {
      throw new ForbiddenException('You can only edit your own exams');
    }

    const patch: Partial<Exam> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.instructions !== undefined) patch.instructions = dto.instructions;
    if (dto.scheduledAt !== undefined)
      patch.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMinutes !== undefined)
      patch.durationMinutes = dto.durationMinutes;
    if (dto.passingScore !== undefined) patch.passingScore = dto.passingScore;
    if (dto.maxAttempts !== undefined) patch.maxAttempts = dto.maxAttempts;
    if (dto.questions !== undefined) patch.questions = dto.questions as any;
    if (dto.status !== undefined) patch.status = dto.status as ExamStatus;
    if (dto.courseId !== undefined) patch.courseId = dto.courseId;
    if (dto.requireScreenShare !== undefined) patch.requireScreenShare = dto.requireScreenShare;
    if (dto.autoFailOnCheat !== undefined) patch.autoFailOnCheat = dto.autoFailOnCheat;

    // Auto-set status when scheduledAt is provided
    if (dto.scheduledAt && !dto.status) {
      patch.status = 'scheduled';
    }

    const updated = await this.examRepository.update(examId, patch);
    return this.formatExam(updated!);
  }

  async remove(
    instituteId: string,
    examId: string,
    userId: string,
    role: string,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
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
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
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
    const exams = await this.examRepository.findByCourseIds(
      courseIds,
      instituteId,
    );
    return exams.map((e) => this.formatExam(e, userId));
  }

  async submitExam(
    instituteId: string,
    examId: string,
    userId: string,
    dto: SubmitExamDto,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    const computedStatus = this.computeStatus(exam);
    const maxAttempts = exam.maxAttempts ?? 1;
    const prevAttempt = exam.studentAttempts?.[userId];
    const usedAttempts: number =
      prevAttempt?.attemptCount ?? (prevAttempt ? 1 : 0);

    // Allow submission if:
    // (a) Exam is currently within its active window, OR
    // (b) Exam was published (status !== 'draft') and student still has remaining attempts.
    //     This covers both "Publish Now" (stored status = 'active') and
    //     "Publish & Schedule" (stored status = 'scheduled') after the window closes.
    const canSubmit =
      computedStatus === 'active' ||
      (exam.status !== 'draft' && usedAttempts < maxAttempts);

    if (!canSubmit) {
      throw new BadRequestException('Exam is not currently active');
    }

    // Cheating-detected failures are permanent — no re-attempts ever.
    if ((prevAttempt as any)?.autoFailed) {
      throw new BadRequestException(
        'You have been disqualified from this exam due to integrity violations. Re-attempts are not permitted.',
      );
    }

    if (usedAttempts >= maxAttempts) {
      throw new BadRequestException(
        `Maximum attempts (${maxAttempts}) reached for this exam`,
      );
    }

    // Score calculation: MCQ auto-graded, short_answer NLP-graded, essay pending review
    let score = 0;
    let hasPendingEssay = false;
    const shortAnswerGrades: Record<string, any> = {};
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);

    for (const q of exam.questions) {
      const studentAnswer = dto.answers[q.id];
      if (q.type === 'essay') {
        if (studentAnswer !== undefined && studentAnswer !== '') {
          hasPendingEssay = true;
        }
      } else if (q.type === 'short_answer') {
        if (studentAnswer !== undefined && studentAnswer !== '') {
          const gradeResult = await this.aiCoreClient.gradeShortAnswer(
            q.question,
            String(studentAnswer),
            q.marks,
            q.sampleAnswer ?? '',
            q.keywords ?? [],
          );
          if (gradeResult) {
            score += gradeResult.score;
            shortAnswerGrades[q.id] = {
              score: gradeResult.score,
              feedback: gradeResult.feedback,
              gradedAt: new Date().toISOString(),
              aiSuggestedScore: gradeResult.score,
              alignmentScore: gradeResult.alignmentScore,
              keywordsMatched: gradeResult.keywordsMatched,
            };
          }
        }
      } else if (studentAnswer === q.correctAnswer) {
        score += q.marks;
      }
    }

    const percentage = Math.round((score / totalMarks) * 100);
    const passed = !hasPendingEssay && percentage >= exam.passingScore;

    // Resolve student name so it appears in the teacher's essay grader
    const studentUser = await this.instituteUserRepository.findById(userId);
    const studentName = studentUser
      ? [studentUser.firstName, studentUser.lastName].filter(Boolean).join(' ') || studentUser.email
      : undefined;

    const attempt: ExamAttempt & { attemptCount: number; studentName?: string } = {
      answers: dto.answers,
      score,
      totalMarks,
      passed,
      submittedAt: new Date().toISOString(),
      pendingEssayReview: hasPendingEssay,
      attemptCount: usedAttempts + 1,
      ...(studentName ? { studentName } : {}),
      ...(Object.keys(shortAnswerGrades).length > 0 && {
        essayGrades: shortAnswerGrades,
      }),
    };

    const updatedAttempts = {
      ...(exam.studentAttempts ?? {}),
      [userId]: attempt,
    };
    await this.examRepository.update(examId, {
      studentAttempts: updatedAttempts,
    });

    return {
      score,
      totalMarks,
      percentage,
      passed,
      passingScore: exam.passingScore,
      pendingEssayReview: hasPendingEssay,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Essay grading
  // ─────────────────────────────────────────────────────────────────────────────

  async saveEssayGrade(
    instituteId: string,
    examId: string,
    studentId: string,
    teacherUserId: string,
    body: { questionId: string; score: number; feedback: string },
  ) {
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.createdByUserId !== teacherUserId)
      throw new ForbiddenException('Not your exam');

    const attempt = exam.studentAttempts?.[studentId];
    if (!attempt)
      throw new NotFoundException('No submission found for this student');

    // Add essay score on top of existing MCQ score
    const essayQuestion = exam.questions.find((q) => q.id === body.questionId);
    if (!essayQuestion) throw new NotFoundException('Question not found');

    const clampedScore = Math.max(0, Math.min(body.score, essayQuestion.marks));
    const newScore = (attempt.score ?? 0) + clampedScore;
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    const percentage = Math.round((newScore / totalMarks) * 100);
    const passed = percentage >= exam.passingScore;

    const updatedAttempt = {
      ...attempt,
      score: newScore,
      totalMarks,
      passed,
      pendingEssayReview: false,
      essayGrades: {
        ...(attempt.essayGrades ?? {}),
        [body.questionId]: {
          score: clampedScore,
          feedback: body.feedback,
          gradedAt: new Date().toISOString(),
          aiSuggestedScore: (attempt.essayGrades?.[body.questionId] as EssayGrade | undefined)?.aiSuggestedScore,
        } satisfies EssayGrade,
      },
    };

    const updatedAttempts = {
      ...(exam.studentAttempts ?? {}),
      [studentId]: updatedAttempt,
    };
    await this.examRepository.update(examId, {
      studentAttempts: updatedAttempts,
    });

    return { success: true, newScore, totalMarks, percentage, passed };
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
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    const flag: IntegrityFlag = {
      id: randomUUID(),
      type,
      severity: SEVERITY_MAP[type] ?? 'medium',
      timestamp: new Date().toISOString(),
      reviewed: false,
    };

    const existing = exam.integrityFlags ?? {};
    const userFlags = [...(existing[userId] ?? []), flag];
    const updatedFlags = { ...existing, [userId]: userFlags };

    // Resolve student full name for alerts
    const studentUser = await this.instituteUserRepository.findById(userId);
    const studentName = studentUser
      ? [studentUser.firstName, studentUser.lastName].filter(Boolean).join(' ') || studentUser.email
      : userId;

    // Auto-fail check: count high-severity flags for this student
    let autoFailed = false;
    const highCount = userFlags.filter((f) => f.severity === 'high').length;

    if (exam.autoFailOnCheat && highCount >= HIGH_VIOLATION_THRESHOLD) {
      const prevAttempt = exam.studentAttempts?.[userId];
      // Only auto-fail if not already failed or submitted
      if (!prevAttempt?.autoFailed) {
        const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
        const autoFailAttempt: ExamAttempt & { attemptCount: number; autoFailed: boolean } = {
          answers: prevAttempt?.answers ?? {},
          score: 0,
          totalMarks,
          passed: false,
          submittedAt: new Date().toISOString(),
          pendingEssayReview: false,
          autoFailed: true,
          attemptCount: (prevAttempt?.attemptCount ?? 0) + 1,
        };
        const updatedAttempts = {
          ...(exam.studentAttempts ?? {}),
          [userId]: autoFailAttempt,
        };
        await this.examRepository.update(examId, {
          integrityFlags: updatedFlags,
          studentAttempts: updatedAttempts,
        } as any);

        // Notify teacher: student was auto-failed
        this.notificationGateway.emitNotification(exam.createdByUserId, {
          type: 'cheat_alert',
          title: 'Student Auto-Failed — Cheating Detected',
          body: `${studentName} was automatically failed in "${exam.title}" after ${highCount} high-severity violations.`,
          metadata: {
            examId,
            examTitle: exam.title,
            studentId: userId,
            studentName,
            studentEmail: studentUser?.email ?? '',
            violationType: type,
            severity: flag.severity,
            totalHighFlags: highCount,
            allFlags: userFlags,
            autoFailed: true,
            timestamp: flag.timestamp,
          },
          timestamp: flag.timestamp,
        });

        return { success: true, flag, autoFailed: true };
      }
    }

    // Always notify teacher for every high-severity violation in real time,
    // regardless of autoFailOnCheat setting or whether threshold is met.
    if (flag.severity === 'high') {
      const isAutoFailed = autoFailed;
      this.notificationGateway.emitNotification(exam.createdByUserId, {
        type: 'cheat_alert',
        title: isAutoFailed ? 'Student Auto-Failed — Cheating Detected' : 'Cheating Violation Detected',
        body: `${studentName} triggered a high-severity violation (${type}) in "${exam.title}". Total high flags: ${highCount}.`,
        metadata: {
          examId,
          examTitle: exam.title,
          studentId: userId,
          studentName,
          studentEmail: studentUser?.email ?? '',
          violationType: type,
          severity: flag.severity,
          totalHighFlags: highCount,
          allFlags: userFlags,
          autoFailed: isAutoFailed,
          timestamp: flag.timestamp,
        },
        timestamp: flag.timestamp,
      });
    }

    await this.examRepository.update(examId, {
      integrityFlags: updatedFlags,
    } as any);
    return { success: true, flag, autoFailed };
  }

  // ── Force auto-fail (client-side termination: 10s countdown expired) ────────

  async forceAutoFail(
    instituteId: string,
    examId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    const exam = await this.examRepository.findByIdWithRelations(examId, instituteId);
    if (!exam) throw new NotFoundException('Exam not found');

    const prevAttempt = exam.studentAttempts?.[userId];
    // No-op if already auto-failed or the student already submitted normally
    if (prevAttempt?.autoFailed) return { success: true };
    if (prevAttempt && prevAttempt.submittedAt && !prevAttempt.autoFailed) {
      // Already has a real submission — don't overwrite with auto-fail
      return { success: true };
    }

    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    const autoFailAttempt: ExamAttempt & { attemptCount: number; autoFailed: boolean; autoFailReason: string } = {
      answers: prevAttempt?.answers ?? {},
      score: 0,
      totalMarks,
      passed: false,
      submittedAt: new Date().toISOString(),
      pendingEssayReview: false,
      autoFailed: true,
      autoFailReason: reason,
      attemptCount: (prevAttempt?.attemptCount ?? 0) + 1,
    };

    await this.examRepository.update(examId, {
      studentAttempts: {
        ...(exam.studentAttempts ?? {}),
        [userId]: autoFailAttempt,
      },
    } as any);

    // Resolve student name for the notification
    const studentUser = await this.instituteUserRepository.findById(userId);
    const studentName = studentUser
      ? [studentUser.firstName, studentUser.lastName].filter(Boolean).join(' ') || studentUser.email
      : userId;

    this.notificationGateway.emitNotification(exam.createdByUserId, {
      type: 'cheat_alert',
      title: 'Student Exam Terminated',
      body: `${studentName}'s exam was terminated in "${exam.title}". Reason: ${reason}`,
      metadata: {
        examId,
        examTitle: exam.title,
        studentId: userId,
        studentName,
        studentEmail: studentUser?.email ?? '',
        violationType: 'tab_switch',
        severity: 'high',
        totalHighFlags: (exam.integrityFlags?.[userId] ?? []).filter((f) => f.severity === 'high').length,
        allFlags: exam.integrityFlags?.[userId] ?? [],
        autoFailed: true,
        autoFailReason: reason,
        timestamp: autoFailAttempt.submittedAt,
      },
      timestamp: autoFailAttempt.submittedAt,
    });

    return { success: true };
  }

  // ── Screen content analysis ────────────────────────────────────────────────

  async screenCheck(
    instituteId: string,
    examId: string,
    userId: string,
    imageB64: string,
  ): Promise<{ suspicious: boolean; reason: string; autoFailed: boolean }> {
    const exam = await this.examRepository.findOne({
      where: { id: examId, instituteId },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // Call ai_core via the API gateway
    const gatewayUrl = process.env.API_GATEWAY_URL ?? 'http://localhost:5001';
    let suspicious = false;
    let reason = '';

    try {
      const res = await fetch(`${gatewayUrl}/api/ai/screen/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64: imageB64 }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const data = await res.json();
        suspicious = !!data.suspicious;
        reason = data.reason ?? '';
      }
    } catch (err) {
      // If analysis fails, don't penalise the student
      return { suspicious: false, reason: 'Analysis unavailable', autoFailed: false };
    }

    if (!suspicious) {
      return { suspicious: false, reason, autoFailed: false };
    }

    // Report as integrity flag — this handles teacher notification + auto-fail logic
    const result = await this.reportIntegrityFlag(
      instituteId,
      examId,
      userId,
      'suspicious_screen',
    );

    return { suspicious: true, reason, autoFailed: result.autoFailed ?? false };
  }

  async getIntegrityFlagsForTeacher(
    instituteId: string,
    teacherUserId: string,
  ) {
    // Exam-type integrity flags only — assessments/quizzes are excluded
    const exams = await this.examRepository.findByCreator(
      teacherUserId,
      instituteId,
    );

    // Collect all student userIds so we can batch-resolve display names
    const userIdSet = new Set<string>();
    for (const exam of exams) {
      for (const uid of Object.keys(exam.integrityFlags ?? {}))
        userIdSet.add(uid);
    }

    const nameMap = new Map<string, string>();
    for (const uid of userIdSet) {
      const user = await this.instituteUserRepository.findById(uid);
      if (user) {
        nameMap.set(
          uid,
          [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        );
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
      detail?: string;
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
            detail: (flag as any).detail,
          });
        }
      }
    }

    rows.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return rows;
  }

  async markFlagReviewed(
    instituteId: string,
    examId: string,
    userId: string,
    flagId: string,
    teacherUserId: string,
  ) {
    const exam = await this.examRepository.findByIdWithRelations(
      examId,
      instituteId,
    );
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.createdByUserId !== teacherUserId)
      throw new ForbiddenException('Not your exam');

    const flags = exam.integrityFlags?.[userId] ?? [];
    const updatedFlags = flags.map((f) =>
      f.id === flagId ? { ...f, reviewed: true } : f,
    );
    await this.examRepository.update(examId, {
      integrityFlags: { ...exam.integrityFlags, [userId]: updatedFlags },
    } as any);
    return { success: true };
  }
}
