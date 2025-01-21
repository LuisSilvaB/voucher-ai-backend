import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelVisionService } from './services/model-vision.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [ModelVisionService],
  exports: [ModelVisionService],
})
export class ModelVisionModule {}
