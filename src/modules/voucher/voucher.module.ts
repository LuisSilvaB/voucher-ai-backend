import { Module } from '@nestjs/common';
import { VoucherService } from './services/voucher.service';
import { VoucherController } from './controllers/voucher.controller';
import { MulterModule } from '@nestjs/platform-express';
@Module({
  imports: [MulterModule.register({ dest: './uploads' })],
  controllers: [VoucherController],
  providers: [VoucherService],
})
export class VoucherModule {}
