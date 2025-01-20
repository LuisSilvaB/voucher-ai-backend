import * as fs from 'fs';
import * as path from 'path';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleVisionService {
  private readonly cloudVisionClient: ImageAnnotatorClient;
  private readonly PATH_TO_CREDENTIALS: string;
  constructor(private readonly configService: ConfigService) {
    this.PATH_TO_CREDENTIALS = this.configService.get('pathToCredentials');
    this.cloudVisionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../../../../', this.PATH_TO_CREDENTIALS),
          'utf-8',
        ),
      ),
    });
  }
  async scanVoucherByGoogleVision(file: Express.Multer.File) {
    try {
      const uploadPath = path.join(
        __dirname,
        '../../../../../uploads',
        file.filename,
      );
      const existFile = fs.existsSync(uploadPath);
      if (existFile) {
        const [result] = await this.cloudVisionClient.textDetection(uploadPath);
        if (result) {
          fs.unlinkSync(uploadPath);
        }
        return result.fullTextAnnotation.text;
      }
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }
}
