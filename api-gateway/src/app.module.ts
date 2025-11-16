import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from './infra/http/http.module';
import { UserProxyModule } from './modules/user-proxy/user-proxy.module';
import { CourseProxyModule } from './modules/course-proxy/course-proxy.module';
import { QuizProxyModule } from './modules/quiz-proxy/quiz-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    UserProxyModule,
    CourseProxyModule,
    QuizProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
