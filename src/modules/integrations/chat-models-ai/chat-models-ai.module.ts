import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModelsAiService } from './services/chat-models-ai.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [ChatModelsAiService],
  exports: [ChatModelsAiService],
})
export class ChatModelsAiModule {}
