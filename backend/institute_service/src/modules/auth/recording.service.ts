import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RecordingRepository } from '../../infra/database/repositories/recording.repository';
import { RecordingCategoryRepository } from '../../infra/database/repositories/recording-category.repository';
import { RecordingCourseAssignmentRepository } from '../../infra/database/repositories/recording-course-assignment.repository';
import { InstituteUserRepository } from '../../infra/database/repositories/institute-user.repository';
import { StudentRepository } from '../../infra/database/repositories/student.repository';
import { MinioService } from '../../infra/storage/minio.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { AssignRecordingDto } from './dto/assign-recording.dto';
import { CreateRecordingCategoryDto } from './dto/create-recording-category.dto';
import { VideoQuestion, VideoQuizAttempt } from './entities/recording.entity';

@Injectable()
export class RecordingService {
  constructor(
    private readonly recordingRepo: RecordingRepository,
    private readonly categoryRepo: RecordingCategoryRepository,
    private readonly assignmentRepo: RecordingCourseAssignmentRepository,
    private readonly minioService: MinioService,
    private readonly instituteUserRepository: InstituteUserRepository,
    private readonly studentRepository: StudentRepository,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns true if the student is enrolled in a course the recording is assigned to
   *  AND that assignment's deadline has not passed (end-of-day). */
  private async checkStudentAccess(
    recording: Awaited<ReturnType<RecordingRepository['findOneWithRelations']>>,
    userId: string,
    instituteId: string,
  ): Promise<boolean> {
    if (!recording) return false;
    const student = await this.studentRepository.findOne({
      where: { userId, instituteId },
      relations: ['courses'],
    });
    if (!student) return false;
    const enrolledCourseIds = new Set((student.courses ?? []).map((c) => c.id));
    return (recording.courseAssignments ?? []).some((a) => {
      if (!enrolledCourseIds.has(a.courseId)) return false;
      const endOfDay = new Date(`${a.deadline}T23:59:59`);
      return endOfDay > new Date();
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private mapAssignment(a: any) {
    // deadline is stored as a date-only string "YYYY-MM-DD" (PostgreSQL date type).
    // Parsing it directly gives UTC midnight, making deadlines set to "today" appear
    // expired immediately. Use end-of-day (23:59:59) so the full day counts as active.
    const deadlineEndOfDay = new Date(`${a.deadline}T23:59:59`);
    const isActive = deadlineEndOfDay > new Date();
    return {
      id: a.id,
      courseId: a.course?.id ?? a.courseId,
      courseName: a.course?.name ?? '',
      deadline: a.deadline,
      status: isActive ? 'active' : 'expired',
    };
  }

  private mapRecording(r: any) {
    return {
      id: r.id,
      title: r.title,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      duration: r.duration ?? '0:00',
      uploadDate: r.createdAt,
      category: r.category
        ? { id: r.category.id, name: r.category.name }
        : null,
      categoryId: r.categoryId ?? null,
      assignments: (r.courseAssignments ?? []).map((a: any) =>
        this.mapAssignment(a),
      ),
    };
  }

  // ── Student recordings ─────────────────────────────────────────────────────

  /** Returns only recordings assigned to an enrolled course with an active deadline */
  async getStudentRecordings(instituteId: string, userId: string) {
    const student = await this.studentRepository.findOne({
      where: { userId, instituteId },
      relations: ['courses'],
    });
    if (!student) return [];

    const enrolledCourseIds = new Set((student.courses ?? []).map((c) => c.id));
    const all = await this.recordingRepo.findByInstituteId(instituteId);

    return all
      .map((r) => {
        const activeAssignments = (r.courseAssignments ?? []).filter((a) => {
          if (!enrolledCourseIds.has(a.courseId)) return false;
          const endOfDay = new Date(`${a.deadline}T23:59:59`);
          return endOfDay > new Date();
        });
        return activeAssignments.length > 0
          ? this.mapRecording({ ...r, courseAssignments: activeAssignments })
          : null;
      })
      .filter(Boolean);
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async getCategories(instituteId: string) {
    return this.categoryRepo.findByInstituteId(instituteId);
  }

  async createCategory(instituteId: string, dto: CreateRecordingCategoryDto) {
    return this.categoryRepo.createForInstitute(dto.name.trim(), instituteId);
  }

  async renameCategory(instituteId: string, categoryId: string, name: string) {
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, instituteId } as any,
    });
    if (!cat) throw new NotFoundException('Category not found');
    const existing = await this.categoryRepo.findOne({
      where: { name: name.trim(), instituteId } as any,
    });
    if (existing && existing.id !== categoryId)
      throw new BadRequestException(`Category "${name.trim()}" already exists`);
    cat.name = name.trim();
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(instituteId: string, categoryId: string) {
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, instituteId } as any,
    });
    if (!cat) throw new NotFoundException('Category not found');
    await this.categoryRepo.delete(categoryId);
    return { message: 'Category deleted' };
  }

  // ── Recordings ─────────────────────────────────────────────────────────────

  async getRecordings(
    instituteId: string,
    filters?: { categoryId?: string; search?: string },
  ) {
    const recordings = await this.recordingRepo.findByInstituteId(
      instituteId,
      filters,
    );
    return recordings.map((r) => this.mapRecording(r));
  }

  async getRecordingById(instituteId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');
    return this.mapRecording(recording);
  }

  async createRecording(
    instituteId: string,
    uploadedById: string,
    dto: CreateRecordingDto,
    file?: Express.Multer.File,
  ) {
    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: { id: dto.categoryId, instituteId } as any,
      });
      if (!cat)
        throw new BadRequestException('Category not found in this institute');
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (file) {
      fileUrl = await this.minioService.uploadFile(file, 'recordings');
      fileName = file.originalname;
    }

    const recording = await this.recordingRepo.create({
      title: dto.title,
      categoryId: dto.categoryId ?? null,
      fileUrl,
      fileName,
      instituteId,
      uploadedById,
    });

    // Optionally assign to a course on upload
    if (dto.courseId && dto.deadline) {
      await this.assignmentRepo.create({
        recordingId: recording.id,
        courseId: dto.courseId,
        deadline: dto.deadline,
      });
    }

    return this.getRecordingById(instituteId, recording.id);
  }

  async updateRecording(
    instituteId: string,
    recordingId: string,
    dto: UpdateRecordingDto,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const cat = await this.categoryRepo.findOne({
          where: { id: dto.categoryId, instituteId } as any,
        });
        if (!cat)
          throw new BadRequestException('Category not found in this institute');
      }
      recording.categoryId = dto.categoryId ?? null;
    }

    if (dto.title) recording.title = dto.title;

    await this.recordingRepo.save(recording);
    return this.getRecordingById(instituteId, recordingId);
  }

  async deleteRecording(instituteId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');

    if (recording.fileName) {
      try {
        await this.minioService.deleteFile(recording.fileName, 'recordings');
      } catch {
        // File may not exist in storage — continue anyway
      }
    }

    await this.recordingRepo.delete(recordingId);
    return { message: 'Recording deleted' };
  }

  // ── Course assignments ─────────────────────────────────────────────────────

  async assignToCourse(
    instituteId: string,
    recordingId: string,
    dto: AssignRecordingDto,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');

    const alreadyAssigned = recording.courseAssignments?.some(
      (a) => a.courseId === dto.courseId,
    );
    if (alreadyAssigned) {
      throw new BadRequestException(
        'Recording is already assigned to this course',
      );
    }

    await this.assignmentRepo.create({
      recordingId,
      courseId: dto.courseId,
      deadline: dto.deadline,
    });

    return this.getRecordingById(instituteId, recordingId);
  }

  async removeAssignment(
    instituteId: string,
    recordingId: string,
    assignmentId: string,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');

    const assignment = recording.courseAssignments?.find(
      (a) => a.id === assignmentId,
    );
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.assignmentRepo.delete(assignmentId);
    return { message: 'Assignment removed' };
  }

  // ── Video questions ────────────────────────────────────────────────────────

  async getVideoQuestions(
    instituteId: string,
    recordingId: string,
    forTeacher = false,
    userId?: string,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');
    const questions = (recording.videoQuestions ?? [])
      .slice()
      .sort((a, b) => a.atSeconds - b.atSeconds);
    if (forTeacher) return { questions };
    // Student access check
    if (userId) {
      const ok = await this.checkStudentAccess(recording, userId, instituteId);
      if (!ok)
        throw new ForbiddenException(
          'This recording is not currently accessible',
        );
    }
    // Strip correct answers for students
    return {
      questions: questions.map(({ correctAnswer: _c, ...q }) => q),
    };
  }

  async saveVideoQuestions(
    instituteId: string,
    recordingId: string,
    questions: VideoQuestion[],
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');
    const sorted = [...questions].sort((a, b) => a.atSeconds - b.atSeconds);
    await this.recordingRepo.save({ ...recording, videoQuestions: sorted });
    return { questions: sorted };
  }

  async submitVideoAttempt(
    instituteId: string,
    recordingId: string,
    userId: string,
    answers: Record<string, number>,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');
    const ok = await this.checkStudentAccess(recording, userId, instituteId);
    if (!ok)
      throw new ForbiddenException(
        'This recording is not currently accessible',
      );

    const questions = recording.videoQuestions ?? [];
    let score = 0;
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

    const questionResults = questions.map((q) => {
      const chosen = answers[q.id] ?? null;
      const correct = chosen !== null && chosen === q.correctAnswer;
      if (correct) score += q.marks;
      return {
        questionId: q.id,
        correct,
        chosen,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      };
    });

    // Merge with any prior attempt so partial submissions accumulate
    const prior = (recording.quizAttempts ?? {})[userId];
    const mergedAnswers = { ...(prior?.answers ?? {}), ...answers };
    const attempt: VideoQuizAttempt = {
      answers: mergedAnswers,
      completedAt: new Date().toISOString(),
    };
    const updated = { ...(recording.quizAttempts ?? {}), [userId]: attempt };
    await this.recordingRepo.save({ ...recording, quizAttempts: updated });

    const percentage =
      totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    return { score, totalMarks, percentage, questionResults };
  }

  async getVideoQuizStats(instituteId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOneWithRelations(
      recordingId,
      instituteId,
    );
    if (!recording) throw new NotFoundException('Recording not found');

    const questions = (recording.videoQuestions ?? [])
      .slice()
      .sort((a, b) => a.atSeconds - b.atSeconds);
    const attempts = recording.quizAttempts ?? {};

    // Enrich with student names
    const studentAttempts: {
      userId: string;
      studentName: string;
      score: number;
      totalMarks: number;
      percentage: number;
      completedAt: string;
      questionResults: {
        questionId: string;
        question: string;
        atSeconds: number;
        correct: boolean;
        chosen: number | null;
        correctAnswer: number;
        marks: number;
      }[];
    }[] = [];
    for (const [userId, attempt] of Object.entries(attempts)) {
      const user = await this.instituteUserRepository.findById(userId);
      const name = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email
        : userId;
      let score = 0;
      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const questionResults = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        atSeconds: q.atSeconds,
        correct: attempt.answers[q.id] === q.correctAnswer,
        chosen: attempt.answers[q.id] ?? null,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      }));
      for (const q of questions) {
        if (attempt.answers[q.id] === q.correctAnswer) score += q.marks;
      }
      const percentage =
        totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      studentAttempts.push({
        userId,
        studentName: name,
        score,
        totalMarks,
        percentage,
        completedAt: attempt.completedAt,
        questionResults,
      });
    }

    // Per-question aggregate stats
    const questionStats = questions.map((q) => {
      const vals = Object.values(attempts);
      const total = vals.length;
      const correct = vals.filter(
        (a) => a.answers[q.id] === q.correctAnswer,
      ).length;
      return {
        questionId: q.id,
        question: q.question,
        atSeconds: q.atSeconds,
        total,
        correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });

    return { studentAttempts, questionStats };
  }
}
