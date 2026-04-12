import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('institutes')
export class Institute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  studentCount: string;

  @Column({ nullable: true })
  referralSource: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 10, default: 'USD', nullable: true })
  currency: string;

  @Column({ type: 'text', nullable: true })
  primaryUseCases: string; // Stored as JSON string

  @Column({ default: 'gpt-4' })
  defaultModel: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 32, default: 'starter' })
  plan: string; // starter | pro | enterprise

  @Column({ type: 'jsonb', default: '[]' })
  enabledFeatures: string[]; // e.g. ['virtual_labs', 'ai_tools', 'voice_agent']

  @Column({ nullable: true })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
