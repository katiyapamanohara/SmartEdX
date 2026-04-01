import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';
import { InstituteUser } from './institute-user.entity';

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed';

export interface ExamQuestion {
  id: string;
  type: 'mcq' | 'essay';
  question: string;
  // MCQ only
  options?: [string, string, string, string];
  correctAnswer?: number; // 0-3
  explanation?: string;
  // Essay only
  sampleAnswer?: string;
  marks: number;
}

export interface ExamAttempt {
  answers: Record<string, number | string>; // questionId -> option index (MCQ) or text (essay)
  score: number;
  totalMarks: number;
  passed: boolean;
  submittedAt: string;
  pendingEssayReview?: boolean;
}

@Entity('exams')
@Index(['courseId', 'instituteId'])
@Index(['status'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'text' })
  instructions: string;

  @Column()
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  instituteId: string;

  @Column()
  createdByUserId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: InstituteUser;

  /** When the exam window opens */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  /** How long students have once the exam is open (minutes) */
  @Column({ default: 60 })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: ExamStatus;

  /** Array of questions stored as JSONB */
  @Column({ type: 'jsonb', default: '[]' })
  questions: ExamQuestion[];

  /** Minimum percentage to pass (0-100) */
  @Column({ default: 50 })
  passingScore: number;

  /** Attempts keyed by student userId */
  @Column({ type: 'jsonb', default: '{}' })
  studentAttempts: Record<string, ExamAttempt>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
