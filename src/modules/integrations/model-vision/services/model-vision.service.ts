import * as fs from 'fs';
import * as path from 'path';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class ModelVisionService {
  private readonly GROQ_API_URL: string;
  private readonly GROQ_API_KEY: string;
  private readonly groqClient: Groq;
  private readonly cloudVisionClient: ImageAnnotatorClient;
  private readonly PATH_TO_CREDENTIALS: string;
  constructor(private readonly configService: ConfigService) {
    this.GROQ_API_URL = this.configService.get('api.groqApiUrl');
    this.GROQ_API_KEY = this.configService.get('api.groqApiKey');
    this.PATH_TO_CREDENTIALS = this.configService.get('pathToCredentials');
    this.cloudVisionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../../../../', this.PATH_TO_CREDENTIALS),
          'utf-8',
        ),
      ),
    });
    this.groqClient = new Groq({
      apiKey: this.GROQ_API_KEY,
    });
  }
  async scanVoucherByGoogleVision(file: Express.Multer.File) {
    try {
      const uploadPath = path.join(
        __dirname,
        '../../../../../tmp',
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

  async scanVoucherByGroqVision(
    file: Express.Multer.File,
    userPrompt: string,
    model: string = 'llama-3.2-11b-vision-preview',
    temperature: number,
  ) {
    try {
      const uploadPath = path.join(
        __dirname,
        '../../../../../tmp',
        file.filename,
      );

      const existFile = fs.existsSync(uploadPath);
      if (!existFile) {
        throw new Error('File not found');
      }

      const imageBuffer = fs.readFileSync(uploadPath);
      const base64Image = imageBuffer.toString('base64');

      const mimeType = file.mimetype || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      const chatCompletion = await this.groqClient.chat.completions.create({
        model: model,
        temperature: temperature,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                },
              },
            ],
          },
        ],
      });
      if (!chatCompletion.choices[0].message.content.length) {
        throw new Error('No content found in response');
      }
      fs.unlinkSync(uploadPath);
      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.log('Error in scanVoucherByGroqVision:', error);
      throw error;
    }
  }
}
