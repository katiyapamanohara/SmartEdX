import { Module } from '@nestjs/common';
import { QuizProxyController } from './quiz-proxy.controller';
import { QuizProxyService } from './quiz-proxy.service';

@Module({
  controllers: [QuizProxyController],
  providers: [QuizProxyService],
})
export class QuizProxyModule {}
