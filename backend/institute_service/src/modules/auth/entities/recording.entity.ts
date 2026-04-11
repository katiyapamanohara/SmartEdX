import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institute } from './institute.entity';
import { InstituteUser } from './institute-user.entity';
import { RecordingCategory } from './recording-category.entity';
import { RecordingCourseAssignment } from './recording-course-assignment.entity';

export interface VideoQuestion {
  id: string;
  atSeconds: number;       // timestamp in the video when the question appears
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;   // 0-3
  marks: number;
}

export interface VideoQuizAttempt {
  answers: Record<string, number>; // questionId → chosen option index
  completedAt: string;
}

@Entity('recordings')
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  duration: string;

  @Column()
  instituteId: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column({ nullable: true })
  uploadedById: string;

  @ManyToOne(() => InstituteUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: InstituteUser;

  @Column({ nullable: true })
  categoryId: string | null;

  @ManyToOne(() => RecordingCategory, (c) => c.recordings, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: RecordingCategory;

  @OneToMany(() => RecordingCourseAssignment, (a) => a.recording, { cascade: true })
  courseAssignments: RecordingCourseAssignment[];

  /** Timed questions attached to this recording (sorted by atSeconds) */
  @Column({ type: 'jsonb', default: '[]' })
  videoQuestions: VideoQuestion[];

  /** Quiz attempts keyed by student userId */
  @Column({ type: 'jsonb', default: '{}' })
  quizAttempts: Record<string, VideoQuizAttempt>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
