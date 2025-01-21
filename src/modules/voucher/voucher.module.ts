import { Module } from '@nestjs/common';
import { VoucherService } from './services/voucher.service';
import { VoucherController } from './controllers/voucher.controller';
import { MulterModule } from '@nestjs/platform-express';
import { SupabaseModule } from 'src/modules/integrations/supabase/supabase.module';
import { ChatModelsAiModule } from 'src/modules/integrations/chat-models-ai/chat-models-ai.module';
import { ModelVisionModule } from '../integrations/model-vision/model-vision.module';
@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),
    SupabaseModule,
    ChatModelsAiModule,
    ModelVisionModule,
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
})
export class VoucherModule {}
