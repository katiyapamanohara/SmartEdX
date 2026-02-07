import { Module } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { StudentProxyController } from './student-proxy.controller';
import { StudentProxyService } from './student-proxy.service';

@Module({
  imports: [NestHttpModule],
  controllers: [StudentProxyController],
  providers: [StudentProxyService],
})
export class StudentProxyModule {}
