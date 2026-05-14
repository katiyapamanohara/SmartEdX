import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './core/filters/http-exception.filter';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  const logger = new Logger('Bootstrap');

  // Enable CORS before any proxy middleware so all routes get CORS headers
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: !corsOrigin || corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  // Increase JSON / URL-encoded body size limit (for base64 cover images etc.)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // ── Voice Agent proxy (HTTP + WebSocket) ──────────────────────────────────
  const voiceAgentTarget =
    process.env.VOICE_AGENT_URL || 'http://localhost:8002';

  // HTTP proxy: /api/voice-agent/* → http://localhost:8002/*
  const voiceAgentHttpProxy = createProxyMiddleware({
    target: voiceAgentTarget,
    changeOrigin: true,
    pathRewrite: { '^/api/voice-agent': '' },
  });

  // WebSocket proxy: /voice-agent/ws/* → ws://localhost:8002/ws/*
  const voiceAgentWsProxy = createProxyMiddleware({
    target: voiceAgentTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/voice-agent': '' },
  });

  app.use('/api/voice-agent', voiceAgentHttpProxy);
  app.use('/voice-agent', voiceAgentWsProxy);

  // Attach WebSocket upgrade handler so WS connections are proxied
  app.getHttpServer().on('upgrade', (req: any, socket: any, head: any) => {
    if (req.url?.startsWith('/voice-agent')) {
      (voiceAgentWsProxy as any).upgrade(req, socket, head);
    }
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
      'API Gateway for AI Quiz System with built-in user management - Routes requests to microservices and handles authentication',
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
    .addTag(
      'Courses',
      'Course management endpoints (proxied to course-service)',
    )
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
  logger.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  logger.log(`📡 Proxying to:`);

  logger.log(`\n🔐 Default Credentials:`);
  logger.log(`   Admin:      admin@example.com / Admin@123`);
}
bootstrap();
