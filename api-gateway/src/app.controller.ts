import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return { message: this.appService.getHello() };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'API Gateway',
      uptime: process.uptime(),
    };
  }

  @Get('api')
  getApiInfo() {
    return {
      name: 'AI Quiz System API Gateway',
      version: '1.0.0',
      description: 'Gateway for routing requests to microservices',
      endpoints: {
        users: '/api/users',
        courses: '/api/courses',
        quizzes: '/api/quizzes',
      },
    };
  }
}
