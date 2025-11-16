import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AI Quiz System API Gateway')
    .setDescription(
      'API Gateway for AI Quiz System - Routes requests to microservices and handles authentication',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints (proxied to user-service)')
    .addTag('Courses', 'Course management endpoints (proxied to course-service)')
    .addTag('Quizzes', 'Quiz management endpoints (proxied to quiz-service)')
    .addTag('Health', 'Health check and system status endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
  logger.log(`📡 Proxying to:`);
  logger.log(
    `   - User Service: ${process.env.USER_SERVICE_URL || 'http://localhost:3001'}`,
  );
  logger.log(
    `   - Course Service: ${process.env.COURSE_SERVICE_URL || 'http://localhost:3002'}`,
  );
  logger.log(
    `   - Quiz Service: ${process.env.QUIZ_SERVICE_URL || 'http://localhost:3003'}`,
  );
}
bootstrap();
