import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from './infra/http/http.module';
import { AuthProxyModule } from './modules/auth-proxy/auth-proxy.module';


import { InstituteProxyModule } from './modules/institute-proxy/institute-proxy.module';
import { StudentProxyModule } from './modules/student-proxy/student-proxy.module';
import { TeacherProxyModule } from './modules/teacher-proxy/teacher-proxy.module';
import { AiProxyModule } from './modules/ai-proxy/ai-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // RedisModule,
    HttpModule,
    AuthProxyModule,
    InstituteProxyModule,
    StudentProxyModule,
    TeacherProxyModule,
    AiProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

