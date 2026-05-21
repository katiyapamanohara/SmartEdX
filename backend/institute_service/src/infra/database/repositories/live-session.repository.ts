import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import {
  LiveSession,
  LiveSessionStatus,
} from '../../../modules/auth/entities/live-session.entity';

@Injectable()
export class LiveSessionRepository extends BaseRepository<LiveSession> {
  constructor(
    @InjectRepository(LiveSession)
    private readonly liveSessionRepository: Repository<LiveSession>,
  ) {
    super(liveSessionRepository);
  }

  async findByInstitute(instituteId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository.find({
      where: { instituteId },
      relations: ['teacher'],
      order: { scheduledAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByTeacher(
    teacherId: string,
    instituteId: string,
  ): Promise<LiveSession[]> {
    return this.liveSessionRepository.find({
      where: { teacherId, instituteId },
      relations: ['teacher'],
      order: { scheduledAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findLiveAndScheduled(instituteId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .where('session.instituteId = :instituteId', { instituteId })
      .andWhere('session.status IN (:...statuses)', {
        statuses: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE],
      })
      .orderBy('session.scheduledAt', 'ASC')
      .getMany();
  }

  /**
   * Returns live/scheduled sessions that are either:
   *  - linked to one of the student's enrolled courses, OR
   *  - not linked to any course (open to the whole institute)
   */
  async findByEnrolledCoursesOrAll(
    instituteId: string,
    enrolledCourseIds: string[],
  ): Promise<LiveSession[]> {
    const qb = this.liveSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .where('session.instituteId = :instituteId', { instituteId })
      .andWhere('session.status IN (:...statuses)', {
        statuses: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE],
      });

    if (enrolledCourseIds.length > 0) {
      qb.andWhere(
        '(session.courseId IS NULL OR session.courseId IN (:...courseIds))',
        { courseIds: enrolledCourseIds },
      );
    } else {
      // Student has no enrolled courses — only show institute-wide sessions
      qb.andWhere('session.courseId IS NULL');
    }

    return qb.orderBy('session.scheduledAt', 'ASC').getMany();
  }

  /**
   * Returns ALL sessions (all statuses) scoped to a student's enrolled courses
   * or institute-wide (no courseId). Used for the "past" tab.
   */
  async findAllByEnrolledCoursesOrAll(
    instituteId: string,
    enrolledCourseIds: string[],
  ): Promise<LiveSession[]> {
    const qb = this.liveSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .where('session.instituteId = :instituteId', { instituteId });

    if (enrolledCourseIds.length > 0) {
      qb.andWhere(
        '(session.courseId IS NULL OR session.courseId IN (:...courseIds))',
        { courseIds: enrolledCourseIds },
      );
    } else {
      qb.andWhere('session.courseId IS NULL');
    }

    return qb
      .orderBy('session.scheduledAt', 'ASC')
      .addOrderBy('session.createdAt', 'DESC')
      .getMany();
  }

  async findWithDetails(sessionId: string): Promise<LiveSession | null> {
    return this.liveSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['teacher'],
    });
  }
}
