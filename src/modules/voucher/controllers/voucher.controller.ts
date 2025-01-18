import { Body, Controller, Get, Post } from '@nestjs/common';
import { VoucherService } from '../services/voucher.service';
import { VoucherType } from '../types/vaucher.type';

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  getVoucher(): Promise<VoucherType[]> {
    return this.voucherService.findAllVouchers();
  }

  @Post('scan')
  scanVoucher(@Body() body: { text: string }) {
    return this.voucherService.scanVoucher(body.text);
  }
}
