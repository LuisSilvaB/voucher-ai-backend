import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateVoucherPrompt } from '../utils/constants/prompt.constant';
import axios from 'axios';

@Injectable()
export class VoucherService {
  private readonly GROQ_API_URL: string;
  private readonly GROQ_API_KEY: string;
  private readonly conf: any;

  constructor(private readonly configService: ConfigService) {
    this.GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    this.GROQ_API_KEY =
      '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';
    this.conf = {
      lang: 'eng',
      oem: 1,
      psm: 4,
    };
    if (!this.GROQ_API_URL || !this.GROQ_API_KEY) {
      throw new Error('Missing GROQ_API_URL or GROQ_API_KEY');
    }
  }
  getVoucher() {
    return 'Voucher Service';
  }
  async scanVoucher(text: string) {
    try {
      console.log('TEXT', text);
      const prompt = generateVoucherPrompt(text ?? '');
      const response = await axios.post(
        this.GROQ_API_URL,
        {
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente experto en análisis de datos',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'mixtral-8x7b-32768',
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageContent = response.data.choices[0].message.content;

      console.log('Message Content:', messageContent);

      return messageContent;
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }
}
