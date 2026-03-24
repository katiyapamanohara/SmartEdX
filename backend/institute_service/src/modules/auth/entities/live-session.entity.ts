import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Institute } from './institute.entity';
import { InstituteUser } from './institute-user.entity';

export enum LiveSessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
}

@Entity('live_sessions')
@Index(['instituteId', 'status'])
@Index(['teacherId', 'instituteId'])
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  courseId: string;

  @Column({ nullable: true })
  courseName: string;

  @Column()
  teacherId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: InstituteUser;

  @Column()
  instituteId: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column({ type: 'varchar', default: LiveSessionStatus.SCHEDULED })
  status: LiveSessionStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ default: 0 })
  participantCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
