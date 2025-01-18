import { Module } from '@nestjs/common';
import { VoucherService } from './services/voucher.service';
import { VoucherController } from './controllers/voucher.controller';
@Module({
  controllers: [VoucherController],
  providers: [VoucherService],
})
export class VoucherModule {}
