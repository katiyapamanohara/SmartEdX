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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
