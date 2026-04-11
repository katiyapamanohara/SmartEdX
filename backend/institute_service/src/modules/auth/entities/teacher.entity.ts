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

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  qualification: string;

  @Column({ nullable: true })
  experience: string;

  @Column({ type: 'date', nullable: true })
  joiningDate: Date;

  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  department: string;

  @OneToOne(() => InstituteUser, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: InstituteUser;

  @Column()
  userId: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column()
  instituteId: string;

  @ManyToMany(() => Course, (course) => course.teachers)
  @JoinTable({ name: 'teacher_courses' })
  courses: Course[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
