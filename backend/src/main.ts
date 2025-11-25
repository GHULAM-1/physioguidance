import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix with versioning
  app.setGlobalPrefix('api/v1');

  // Enable CORS with proper origin for credentials
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:8080',
    'http://localhost:3000'
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
