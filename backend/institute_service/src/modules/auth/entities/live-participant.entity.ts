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
import { LiveSession } from './live-session.entity';
import { InstituteUser } from './institute-user.entity';

@Entity('live_participants')
@Index(['sessionId', 'userId'], { unique: true })
export class LiveParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => LiveSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: LiveSession;

  @Column()
  userId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: InstituteUser;

  @Column()
  instituteId: string;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
