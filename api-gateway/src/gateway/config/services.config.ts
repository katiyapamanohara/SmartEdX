import { registerAs } from '@nestjs/config';

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
  healthCheck?: string;
}

export interface ServicesConfiguration {
  services: {
    quiz: ServiceConfig;
    user: ServiceConfig;
    analytics: ServiceConfig;
    // Add more services as needed
  };
  defaultTimeout: number;
  defaultRetries: number;
}

export default registerAs(
  'microservices',
  (): ServicesConfiguration => ({
    services: {
      quiz: {
        name: 'quiz-service',
        baseUrl: process.env.QUIZ_SERVICE_URL || 'http://localhost:4001',
        timeout: parseInt(process.env.QUIZ_SERVICE_TIMEOUT || '10000', 10),
        retries: parseInt(process.env.QUIZ_SERVICE_RETRIES || '3', 10),
        healthCheck: '/health',
      },
      user: {
        name: 'user-service',
        baseUrl: process.env.USER_SERVICE_URL || 'http://localhost:4002',
        timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '10000', 10),
        retries: parseInt(process.env.USER_SERVICE_RETRIES || '3', 10),
        healthCheck: '/health',
      },
      analytics: {
        name: 'analytics-service',
        baseUrl:
          process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4003',
        timeout: parseInt(process.env.ANALYTICS_SERVICE_TIMEOUT || '10000', 10),
        retries: parseInt(process.env.ANALYTICS_SERVICE_RETRIES || '3', 10),
        healthCheck: '/health',
      },
    },
    defaultTimeout: parseInt(process.env.DEFAULT_SERVICE_TIMEOUT || '10000', 10),
    defaultRetries: parseInt(process.env.DEFAULT_SERVICE_RETRIES || '3', 10),
  }),
);
