import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { DatabaseInitializer } from './database/database-initializer';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

interface RootResponse {
  message: string;
  documentation: string;
  health: string;
  version: string;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    await DatabaseInitializer.initializeDatabase();
    logger.log('Database initialized successfully');

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());

    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`],
          manifestSrc: [`'self'`],
          frameSrc: [`'self'`],
        },
      },
    }));

    const corsOrigin = configService.get<string>('CORS_ORIGIN') || '*';
    app.enableCors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control'
      ],
      credentials: true,
    });

    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        disableErrorMessages: isProduction,
      }),
    );

    app.setGlobalPrefix('api', {
      exclude: ['/health', '/', '/docs'],
    });

  
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Job Aggregator API')
      .setDescription(`
        🚀 **Job Aggregator API** - Your ultimate job search companion!

        ## Base URL
        \`http://localhost:5001/api\`

        ## Available Endpoints:
        - 📊 **GET /jobs** - Get all jobs with pagination and filters
        - 🔍 **GET /jobs/search** - Search jobs by query
        - 📈 **GET /jobs/stats** - Get job statistics
        - 💼 **GET /jobs/{id}** - Get single job details
        - 🔄 **POST /jobs/trigger** - Trigger manual job aggregation
        - ❤️ **GET /jobs/health** - Health check

        Built with ❤️ using NestJS, TypeORM, and MySQL
      `)
      .setVersion('1.0.0')
      .addTag('jobs', 'Job offers management and search')
      .addTag('stats', 'Job market statistics and analytics')
      .addTag('health', 'Application health checks')
      .addServer(`http://localhost:${configService.get<number>('PORT', 3000)}`, 'API Base')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Job Aggregator API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });

    
    app.getHttpAdapter().get('/health', (_req: Request, res: Response) => {
      const healthResponse: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: configService.get<string>('NODE_ENV', 'development'),
        version: '1.0.0',
      };
      res.status(200).json(healthResponse);
    });

    
    app.getHttpAdapter().get('/', (_req: Request, res: Response) => {
      const rootResponse: RootResponse = {
        message: '🚀 Job Aggregator API is running!',
        documentation: '/docs',
        health: '/health',
        version: '1.0.0',
      };
      res.status(200).json(rootResponse);
    });

    const port = configService.get<number>('PORT', 3000);
    const host = configService.get<string>('HOST', '0.0.0.0');

    await app.listen(port, host);

    
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
    logger.log(`❤️  Health check: http://localhost:${port}/health`);
    logger.log(`🔗 API Base URL: http://localhost:${port}/api`);
    logger.log(`🌍 Environment: ${configService.get<string>('NODE_ENV', 'development')}`);

  } catch (error) {
    logger.error('❌ Error starting the application:', error);
    process.exit(1);
  }
}


process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  const logger = new Logger('SIGTERM');
  logger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = new Logger('SIGINT');
  logger.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

void bootstrap();
