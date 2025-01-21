import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('port');
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.enableCors({
    origin: ['http://localhost:4000', 'https://voucher-ai-frontend.vercel.app'],
    methods: 'GET,POST,PUT,DELETE',
  });
  await app.listen(port ?? 3000);
  console.log(`Server running on port ${port} 🚀`);
}
bootstrap();
