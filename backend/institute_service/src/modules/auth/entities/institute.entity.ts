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
import { Course } from './course.entity';



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

  @Column({ type: 'text', nullable: true })
  primaryUseCases: string; // Stored as JSON string

  @Column({ default: 'gpt-4' })
  defaultModel: string;

  @Column({ type: 'text', nullable: true })
  voiceInstructions: string;

  @Column({ type: 'text', nullable: true })
  voiceGreeting: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 32, default: 'starter' })
  plan: string;

  @Column({ type: 'jsonb', default: '[]' })
  enabledFeatures: string[];

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @OneToMany(() => Course, (course) => course.institute)
  courses: Course[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
