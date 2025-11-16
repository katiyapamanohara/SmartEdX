import { Module } from '@nestjs/common';
import { CourseProxyController } from './course-proxy.controller';
import { CourseProxyService } from './course-proxy.service';

@Module({
  controllers: [CourseProxyController],
  providers: [CourseProxyService],
})
export class CourseProxyModule {}
