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

export type IntegrityViolationType =
  | 'tab_switch'
  | 'face_absent'
  | 'multiple_faces'
  | 'face_verify_failed'
  | 'camera_disabled'
  | 'fullscreen_exit'
  | 'screen_share_disabled'
  | 'live_face_mismatch'
  | 'suspicious_screen'
  | 'copy_attempt';

export interface IntegrityFlag {
  id: string;
  type: IntegrityViolationType;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  reviewed: boolean;
}

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
  autoFailed?: boolean; // true when student was auto-failed due to cheating
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

  /** Whether students must verify their identity via face recognition before starting */
  @Column({ default: false })
  requireFaceId: boolean;

  /** Whether students must share their screen during the exam */
  @Column({ default: false })
  requireScreenShare: boolean;

  /** Whether to run live face recognition checks (via face_recognition_server) every 60 s during exam */
  @Column({ default: false })
  enableLiveFaceCheck: boolean;

  /** Auto-fail student when high-severity violations reach the threshold (3) */
  @Column({ default: false })
  autoFailOnCheat: boolean;

  /** Maximum number of attempts allowed per student (default 1) */
  @Column({ default: 1 })
  maxAttempts: number;

  /** Attempts keyed by student userId */
  @Column({ type: 'jsonb', default: '{}' })
  studentAttempts: Record<string, ExamAttempt & { attemptCount?: number }>;

  /** Integrity flags keyed by student userId */
  @Column({ type: 'jsonb', default: '{}' })
  integrityFlags: Record<string, IntegrityFlag[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
