import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { InstituteUser } from './institute-user.entity';
import { Institute } from './institute.entity';
import { Course } from './course.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  admissionNumber: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  parentName: string;
  
  @Column({ nullable: true })
  parentContact: string;

  @OneToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: InstituteUser;

  @Column()
  userId: string;

  @Column({ nullable: true })
  batchNumber: string;

  /** 128-d face descriptor stored as float array for identity verification */
  @Column({ type: 'jsonb', nullable: true })
  faceDescriptor: number[] | null;

  @ManyToMany(() => Course, (course) => course.students)
  @JoinTable({
    name: 'student_courses',
    joinColumn: { name: 'studentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'courseId', referencedColumnName: 'id' }
  })
  courses: Course[];
 
  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column()
  instituteId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
