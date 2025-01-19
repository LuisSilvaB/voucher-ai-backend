import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { VoucherService } from '../services/voucher.service';
import { VoucherType } from '../types/vaucher.type';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  getVoucher(): Promise<VoucherType[]> {
    return this.voucherService.findAllVouchers();
  }

  @Post('scan')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  scanVoucher(
    @UploadedFile() file: Express.Multer.File,
    @Body('text') text: string,
  ) {
    return this.voucherService.scanVoucher(text, file);
  }

  @Delete('delete-voucher')
  deleteVoucher(@Query('id') id: string) {
    return this.voucherService.deleteVoucher(id);
  }
}
