import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InstituteUser } from './institute-user.entity';

export type NotificationType = 'message' | 'email' | 'reminder' | 'cheat_alert';

@Entity('notifications')
@Index(['userId', 'instituteId'])
@Index(['isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: InstituteUser;

  @Column()
  instituteId: string;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ default: false })
  isRead: boolean;

  /** Optional extra data (e.g. senderId, messageId, reminderId) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
