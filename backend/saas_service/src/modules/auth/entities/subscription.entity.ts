import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Institute } from './institute.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  instituteId: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'instituteId' })
  institute: Institute;

  @Column({ type: 'varchar', length: 32, default: 'starter' })
  plan: string; // starter | pro | enterprise

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string; // active | inactive | cancelled | trial

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 32, default: 'monthly' })
  billingCycle: string; // monthly | yearly

  @Column({ type: 'varchar', length: 64, nullable: true })
  paymentMethod: string; // card | bank_transfer | manual

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextBillingDate: Date;

  @Column({ type: 'varchar', nullable: true })
  notes: string;

  // PayHere specific fields
  @Column({ type: 'varchar', nullable: true })
  payhereOrderId: string;

  @Column({ type: 'varchar', nullable: true })
  payherePaymentId: string;

  @Column({ type: 'varchar', length: 32, default: 'LKR' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
