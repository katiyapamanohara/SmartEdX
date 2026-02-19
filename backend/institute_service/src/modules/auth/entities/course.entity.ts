import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institute } from './institute.entity';
import { Teacher } from './teacher.entity';

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

  @ManyToOne(() => Institute, (institute) => institute.courses)
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column()
  instituteId: string;

  @ManyToMany(() => Teacher, (teacher) => teacher.courses)
  teachers: Teacher[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
