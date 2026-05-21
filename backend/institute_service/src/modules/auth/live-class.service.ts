import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { LiveSessionRepository } from '../../infra/database/repositories/live-session.repository';
import { LiveParticipantRepository } from '../../infra/database/repositories/live-participant.repository';
import { CourseRepository } from '../../infra/database/repositories/course.repository';
import { LiveSession, LiveSessionStatus } from './entities/live-session.entity';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';

@Injectable()
export class LiveClassService {
  constructor(
    private readonly liveSessionRepo: LiveSessionRepository,
    private readonly liveParticipantRepo: LiveParticipantRepository,
    private readonly courseRepo: CourseRepository,
  ) {}

  async createSession(
    instituteId: string,
    teacherId: string,
    dto: CreateLiveSessionDto,
  ): Promise<LiveSession> {
    return this.liveSessionRepo.create({
      title: dto.title,
      description: dto.description,
      courseId: dto.courseId,
      courseName: dto.courseName,
      teacherId,
      instituteId,
      status: LiveSessionStatus.SCHEDULED,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });
  }

  async getTeacherSessions(teacherId: string, instituteId: string) {
    const sessions = await this.liveSessionRepo.findByTeacher(
      teacherId,
      instituteId,
    );
    return sessions.map((s) => this.formatSession(s, teacherId));
  }

  async getStudentSessions(instituteId: string, studentId: string) {
    // Resolve the course IDs this student is enrolled in
    const enrolledCourses = await this.courseRepo.findByStudentUserId(
      studentId,
      instituteId,
    );
    const enrolledCourseIds = enrolledCourses.map((c) => c.id);

    // Return sessions linked to those courses + sessions with no course (open to all)
    const sessions = await this.liveSessionRepo.findByEnrolledCoursesOrAll(
      instituteId,
      enrolledCourseIds,
    );
    return sessions.map((s) => this.formatSession(s, null));
  }

  async getAllStudentSessionsHistory(instituteId: string, studentId: string) {
    const enrolledCourses = await this.courseRepo.findByStudentUserId(
      studentId,
      instituteId,
    );
    const enrolledCourseIds = enrolledCourses.map((c) => c.id);

    const sessions = await this.liveSessionRepo.findAllByEnrolledCoursesOrAll(
      instituteId,
      enrolledCourseIds,
    );
    return sessions.map((s) => this.formatSession(s, null));
  }

  async getAllSessions(instituteId: string) {
    const sessions = await this.liveSessionRepo.findByInstitute(instituteId);
    return sessions.map((s) => this.formatSession(s, null));
  }

  async getSession(sessionId: string) {
    const session = await this.liveSessionRepo.findWithDetails(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    return this.formatSession(session, null);
  }

  async startSession(
    sessionId: string,
    teacherId: string,
    instituteId: string,
  ) {
    const session = await this.liveSessionRepo.findWithDetails(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.teacherId !== teacherId)
      throw new ForbiddenException('Not your session');
    if (session.instituteId !== instituteId)
      throw new ForbiddenException('Unauthorized');

    await this.liveSessionRepo.update(sessionId, {
      status: LiveSessionStatus.LIVE,
      startedAt: new Date(),
    });

    return this.getSession(sessionId);
  }

  async endSession(sessionId: string, teacherId: string, instituteId: string) {
    const session = await this.liveSessionRepo.findWithDetails(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.teacherId !== teacherId)
      throw new ForbiddenException('Not your session');
    if (session.instituteId !== instituteId)
      throw new ForbiddenException('Unauthorized');

    await this.liveSessionRepo.update(sessionId, {
      status: LiveSessionStatus.ENDED,
      endedAt: new Date(),
    });

    return this.getSession(sessionId);
  }

  async deleteSession(
    sessionId: string,
    teacherId: string,
    instituteId: string,
  ) {
    const session = await this.liveSessionRepo.findWithDetails(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.teacherId !== teacherId)
      throw new ForbiddenException('Not your session');
    if (session.status === LiveSessionStatus.LIVE)
      throw new ForbiddenException('Cannot delete a live session');

    await this.liveSessionRepo.delete(sessionId);
    return { success: true };
  }

  async joinSession(sessionId: string, userId: string, instituteId: string) {
    const session = await this.liveSessionRepo.findWithDetails(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.instituteId !== instituteId)
      throw new ForbiddenException('Unauthorized');

    await this.liveParticipantRepo.upsertParticipant(
      sessionId,
      userId,
      instituteId,
    );
    return this.getSession(sessionId);
  }

  async leaveSession(sessionId: string, userId: string) {
    await this.liveParticipantRepo.markLeft(sessionId, userId);
    return { success: true };
  }

  async getSessionParticipants(sessionId: string) {
    const participants =
      await this.liveParticipantRepo.findActiveBySession(sessionId);
    return participants.map((p) => ({
      id: p.userId,
      firstName: p.user?.firstName,
      lastName: p.user?.lastName,
      email: p.user?.email,
      profilePicture: p.user?.profilePicture,
      joinedAt: p.joinedAt,
    }));
  }

  private formatSession(session: LiveSession, currentUserId: string | null) {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      courseId: session.courseId,
      courseName: session.courseName,
      teacherId: session.teacherId,
      teacherName: session.teacher
        ? `${session.teacher.firstName} ${session.teacher.lastName}`
        : undefined,
      teacherEmail: session.teacher?.email,
      teacherAvatar: session.teacher?.profilePicture,
      status: session.status,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      participantCount: session.participantCount,
      isOwner: currentUserId ? session.teacherId === currentUserId : false,
      instituteId: session.instituteId,
      createdAt: session.createdAt,
    };
  }
}
