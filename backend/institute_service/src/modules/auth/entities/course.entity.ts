import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Institute } from './institute.entity';
import { Teacher } from './teacher.entity';

import { CourseModule } from './course-module.entity';
import { Student } from './student.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'varchar', length: 10, default: 'fixed' })
  paymentType: 'fixed' | 'monthly';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPrice: number | null;

  @Column({ type: 'text', nullable: true })
  studentAgentInstructions: string | null;

  @Column({ type: 'text', nullable: true })
  teacherAgentInstructions: string | null;

  @ManyToOne(() => Institute, (institute) => institute.courses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column()
  instituteId: string;

  @ManyToMany(() => Teacher, (teacher) => teacher.courses)
  teachers: Teacher[];

  @OneToMany(() => CourseModule, (module) => module.course)
  modules: CourseModule[];

  @ManyToMany(() => Student, (student) => student.courses)
  students: Student[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
