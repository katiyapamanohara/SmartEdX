import { Module } from '@nestjs/common';
import { PayhereController } from './payhere.controller';
import { PayhereService } from './payhere.service';
import { RepositoriesModule } from '../../infra/database/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PayhereController],
  providers: [PayhereService],
  exports: [PayhereService],
})
export class PayhereModule {}
