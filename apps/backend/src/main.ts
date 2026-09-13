import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app/app.module';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
<<<<<<< HEAD
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
=======
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
>>>>>>> origin/feature/clinical-documentation-transcription
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `🚀 Hospital Backend API running on: http://localhost:${port}/${'api'}`,
  );
}

bootstrap();
