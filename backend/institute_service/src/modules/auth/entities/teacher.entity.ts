import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { InstituteUser } from './institute-user.entity';
import { Institute } from './institute.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  employeeId: string;

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

  @ManyToOne(() => Institute)
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column()
  instituteId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
