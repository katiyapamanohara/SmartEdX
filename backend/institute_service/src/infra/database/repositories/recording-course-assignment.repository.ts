import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { RecordingCourseAssignment } from '../../../modules/auth/entities/recording-course-assignment.entity';

@Injectable()
export class RecordingCourseAssignmentRepository extends BaseRepository<RecordingCourseAssignment> {
  constructor(
    @InjectRepository(RecordingCourseAssignment)
    private readonly repo: Repository<RecordingCourseAssignment>,
  ) {
    super(repo);
  }

  async findByRecordingId(recordingId: string): Promise<RecordingCourseAssignment[]> {
    return this.repo.find({
      where: { recordingId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }
}
