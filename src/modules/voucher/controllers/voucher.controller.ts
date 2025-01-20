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

  @Post('scan-tesseract')
  scanVoucherTesseract(
    @Body() body: { text: string; model: 'gemini' | 'together' | 'groq' },
  ) {
    console.log(body);
    return this.voucherService.getVoucherDataByModel(body.text, body.model);
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
  scanVoucherGoogleVision(
    @UploadedFile()
    file: Express.Multer.File,
    @Body()
    body: {
      model: 'gemini' | 'together' | 'groq';
    },
  ) {
    return this.voucherService.getVoucherDataByGoogleVision(file, body.model);
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
