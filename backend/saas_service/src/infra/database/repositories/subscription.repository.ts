import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Subscription } from '../../../modules/auth/entities/subscription.entity';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {
    super(subscriptionRepo);
  }

  async findByInstituteId(instituteId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({ where: { instituteId } });
  }

  async findAllWithInstitutes(): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      relations: ['institute'],
      order: { createdAt: 'DESC' },
    });
  }

  async countByPlan(): Promise<{ plan: string; count: number }[]> {
    return this.subscriptionRepo
      .createQueryBuilder('sub')
      .select('sub.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .where('sub.status = :status', { status: 'active' })
      .groupBy('sub.plan')
      .getRawMany();
  }

  async findByOrderId(orderId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: { payhereOrderId: orderId },
    });
  }

  async getTotalMonthlyRevenue(): Promise<number> {
    const result = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .select('SUM(sub.price)', 'total')
      .where('sub.status = :status', { status: 'active' })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }
}
