import { Module } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { TeacherProxyController } from './teacher-proxy.controller';
import { TeacherProxyService } from './teacher-proxy.service';

@Module({
  imports: [NestHttpModule],
  controllers: [TeacherProxyController],
  providers: [TeacherProxyService],
})
export class TeacherProxyModule {}
