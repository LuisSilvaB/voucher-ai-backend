import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
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

  @Post('scan-tesseract-groq')
  @UseInterceptors(FileInterceptor('text'))
  scanVoucherGroq(@Req() req) {
    return this.voucherService.scanVoucherGroq(req.body.text);
  }

  @Post('scan-tesseract-together')
  @UseInterceptors(FileInterceptor('text'))
  scanVoucherTesseract(@Req() req) {
    return this.voucherService.scanVoucherTogether(req.body.text);
  }

  @Post('scan-google-vision')
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
  scanVoucherGoogleVision(@UploadedFile() file: Express.Multer.File) {
    return this.voucherService.scanVoucherGoogleVisionAndGemini(file);
  }

  @Post('create-voucher')
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
  createVoucher(
    @UploadedFile() file: Express.Multer.File,
    @Body('voucher') voucher: string,
  ) {
    const parsedVoucher = JSON.parse(voucher);
    return this.voucherService.createVoucher(parsedVoucher, file);
  }

  @Delete('delete-voucher')
  deleteVoucher(@Query('id') id: string) {
    return this.voucherService.deleteVoucher(id);
  }
}
