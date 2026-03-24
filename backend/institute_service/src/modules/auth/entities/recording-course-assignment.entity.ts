import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Recording } from './recording.entity';
import { Course } from './course.entity';

@Entity('recording_course_assignments')
export class RecordingCourseAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recordingId: string;

  @ManyToOne(() => Recording, (r) => r.courseAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordingId' })
  recording: Recording;

  @Column()
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'date' })
  deadline: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
