import { Body, Controller, Get, Post } from '@nestjs/common';
import { VoucherService } from '../services/voucher.service';

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  getVoucher(): string {
    return this.voucherService.getVoucher();
  }

  @Post('scan')
  scanVoucher(@Body() body: { text: string }) {
    return this.voucherService.scanVoucher(body.text);
  }
}
