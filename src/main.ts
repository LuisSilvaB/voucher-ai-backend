import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Express } from 'express';

let app: INestApplication;
let expressApp: Express;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.enableCors({
      origin: configService.get('corsOrigin') ?? 'http://localhost:4000',
      methods: 'GET,POST,PUT,DELETE',
    });

    await app.init();
    expressApp = app.getHttpAdapter().getInstance();
  }
  return expressApp;
}

if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(async () => {
    const configService = app.get(ConfigService);
    const port = configService.get('port') || 3000;
    await app.listen(port);
    console.log(`Server running on port ${port} 🚀`);
  });
}

export default async function handler(req: any, res: any) {
  const expressApp = await bootstrap();
  return new Promise((resolve, reject) => {
    expressApp(req, res, (err?: any) => {
      if (err) {
        return reject(err);
      }
      resolve(undefined);
    });
  });
}
