import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app/app.module';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // Transcription uses base64 JSON (about 4/3 the binary audio size).
  // Keep the limit explicit and configurable without changing the API contract.
  const documentationAudioLimit = process.env.DOCUMENTATION_AUDIO_BODY_LIMIT || '64mb';
  app.use(json({ limit: documentationAudioLimit }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `🚀 Hospital Backend API running on: http://localhost:${port}/${'api'}`,
  );
}

bootstrap();
