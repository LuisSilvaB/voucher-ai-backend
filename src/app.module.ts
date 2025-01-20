import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VoucherModule } from './modules/voucher/voucher.module';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';
import { SupabaseModule } from './modules/integrations/supabase/supabase.module';
import { ChatModelsAiModule } from './modules/integrations/chat-models-ai/chat-models-ai.module';
import { GoogleVisionModule } from './modules/integrations/google-vision/google-vision.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    SupabaseModule,
    ChatModelsAiModule,
    GoogleVisionModule,
    VoucherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
