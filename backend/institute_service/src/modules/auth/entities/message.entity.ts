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
import { InstituteUser } from './institute-user.entity';

@Entity('messages')
@Index(['senderId', 'recipientId'])
@Index(['instituteId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: InstituteUser;

  @Column()
  recipientId: string;

  @ManyToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: InstituteUser;

  @Column('text')
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column()
  instituteId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
