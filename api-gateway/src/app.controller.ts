import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './core/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello() {
    return { message: this.appService.getHello() };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Returns health status' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'API Gateway',
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get('api')
  @ApiOperation({ summary: 'API information' })
  @ApiResponse({
    status: 200,
    description: 'Returns API endpoints information',
  })
  getApiInfo() {
    return {
      name: 'AI Quiz System API Gateway',
      version: '1.0.0',
      description: 'Gateway for routing requests to microservices',
      endpoints: {
        auth: '/auth',
        users: '/api/users',
        courses: '/api/courses',
        quizzes: '/api/quizzes',
      },
    };
  }
}
