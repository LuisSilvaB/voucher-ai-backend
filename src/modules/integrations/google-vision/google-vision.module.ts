import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleVisionService } from './services/google-vision.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [GoogleVisionService],
  exports: [GoogleVisionService],
})
export class GoogleVisionModule {}
