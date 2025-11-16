import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global prefix
  app.setGlobalPrefix('');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  logger.log(`📡 Proxying to:`);
  logger.log(`   - User Service: ${process.env.USER_SERVICE_URL || 'http://localhost:3001'}`);
  logger.log(`   - Course Service: ${process.env.COURSE_SERVICE_URL || 'http://localhost:3002'}`);
  logger.log(`   - Quiz Service: ${process.env.QUIZ_SERVICE_URL || 'http://localhost:3003'}`);
}
bootstrap();
