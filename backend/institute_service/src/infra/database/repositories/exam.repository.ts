import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Exam } from '../../../modules/auth/entities/exam.entity';

@Injectable()
export class ExamRepository extends BaseRepository<Exam> {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
  ) {
    super(examRepo);
  }

  /** All exams for an institute (institute admin view) */
  findByInstitute(instituteId: string): Promise<Exam[]> {
    return this.examRepo.find({
      where: { instituteId },
      relations: ['course', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Exams created by a specific teacher (across their courses) */
  findByCreator(createdByUserId: string, instituteId: string): Promise<Exam[]> {
    return this.examRepo.find({
      where: { createdByUserId, instituteId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Exams for specific course IDs (student view — their enrolled courses) */
  findByCourseIds(courseIds: string[], instituteId: string): Promise<Exam[]> {
    if (!courseIds.length) return Promise.resolve([]);
    return this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.course', 'course')
      .leftJoinAndSelect('exam.createdBy', 'createdBy')
      .where('exam.instituteId = :instituteId', { instituteId })
      .andWhere('exam.courseId IN (:...courseIds)', { courseIds })
      .andWhere("exam.status != 'draft'")
      .orderBy('exam.scheduledAt', 'ASC')
      .getMany();
  }

  findByIdWithRelations(id: string, instituteId: string): Promise<Exam | null> {
    return this.examRepo.findOne({
      where: { id, instituteId },
      relations: ['course', 'createdBy'],
    });
  }
}
