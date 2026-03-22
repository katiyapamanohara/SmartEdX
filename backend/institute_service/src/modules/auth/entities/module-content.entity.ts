import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';

export enum ContentType {
  PDF = 'pdf',
  VIDEO = 'video',
  DOCUMENT = 'document',
  QUIZ = 'quiz',
  LINK = 'link',
}

@Entity('module_contents')
export class ModuleContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.DOCUMENT,
  })
  type: ContentType;

  @Column({ nullable: true })
  url: string; // URL for the video, pdf, or external link

  @Column({ type: 'jsonb', nullable: true })
  quizData: any; // Quiz questions and settings (for type=quiz)

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => CourseModule, (courseModule) => courseModule.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module: CourseModule;

  @Column()
  moduleId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
