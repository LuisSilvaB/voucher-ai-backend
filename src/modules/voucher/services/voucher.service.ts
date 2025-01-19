import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateVoucherPrompt } from '../utils/constants/prompt.constant';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ItemType, VoucherType } from '../types/vaucher.type';
@Injectable()
export class VoucherService {
  private readonly GROQ_API_URL: string;
  private readonly GROQ_API_KEY: string;
  private readonly conf: any;
  private readonly supabaseClient: SupabaseClient;
  private readonly logger = new Logger(VoucherService.name);

  constructor(private readonly configService: ConfigService) {
    this.GROQ_API_URL = this.configService.get('api.groqApiUrl');
    this.GROQ_API_KEY = this.configService.get('api.groqApiKey');
    this.supabaseClient = createClient(
      this.configService.get('api.supabaseUrl'),
      this.configService.get('api.supabaseKey'),
    );
    this.conf = {
      lang: 'eng',
      oem: 1,
      psm: 4,
    };
    if (!this.GROQ_API_URL || !this.GROQ_API_KEY || !this.supabaseClient) {
      throw new Error('Some config is missing');
    }
  }
  async findAllVouchers() {
    try {
      const { data, error } = await this.supabaseClient
        .from('VOUCHERS')
        .select('*, ITEMS(*)')
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (error) {
      console.log('Error in getVouchers:', error);
      throw error;
    }
  }
  async scanVoucherTesseract(text: string) {
    try {
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

      console.log(response.data.choices[0].message.content);

      const regex = /```json([\s\S]*?)```/;
      let match = response.data.choices[0].message.content.match(regex);
      let json = '';

      if (match) {
        json = match[1].trim();
      } else {
        const jsonRegex = /{[\s\S]*}/;
        match = response.data.choices[0].message.content.match(jsonRegex);
        if (match) {
          json = match[0].trim();
        } else {
          throw new Error('No JSON found in response');
        }
      }

      json = json.replace(/\\_/g, '_');

      const messageContent = JSON.parse(json);
      return messageContent;
      // const { data, error } = await this.supabaseClient
      //   .from('VOUCHERS')
      //   .insert({
      //     transaction_number: messageContent.transaction_number,
      //     date: messageContent.date,
      //     igv: messageContent.igv,
      //     total: messageContent.total,
      //     vendor: messageContent.vendor,
      //     tax_amount: messageContent.tax_amount,
      //     client: messageContent.client,
      //     img_name: file.filename,
      //   })
      //   .select('*');
      // if (error) {
      //   throw new Error(error.message);
      // }

      // const uploadPath = path.join(
      //   __dirname,
      //   '../../../../uploads',
      //   file.filename,
      // );
      // const existFile = fs.existsSync(uploadPath);
      // if (!existFile) {
      //   throw new Error('File does not exist');
      // }

      // const fileContent = fs.readFileSync(uploadPath);
      // const { data: s3Data, error: s3Error } = await this.supabaseClient.storage
      //   .from('VOUCHER_AI')
      //   .upload(`/VOUCHERS/${file.filename}`, fileContent);

      // if (s3Error || !s3Data) {
      //   throw new Error(`Failed to upload file: ${s3Data}, ${s3Error.message}`);
      // }

      // // delete file from uploads folder
      // fs.unlinkSync(uploadPath);

      // const itemsToInsert = messageContent.items.map((item: ItemType) => ({
      //   code: item.code,
      //   name: item.name,
      //   quantity: item.quantity,
      //   unit_price: item.unit_price,
      //   total: item.total,
      //   VOUCHER_ID: data[0].id,
      // }));

      // const { data: items, error: itemsError } = await this.supabaseClient
      //   .from('ITEMS')
      //   .insert(itemsToInsert)
      //   .select('*');
      // if (itemsError) {
      //   throw new Error(itemsError.message);
      // }
      // const newVoucher: VoucherType = {
      //   ...data[0],
      //   ITEMS: items,
      // };
      // return JSON.stringify(newVoucher);
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }

  async createVoucher(voucher: VoucherType, file: Express.Multer.File) {}

  async deleteVoucher(id: string) {
    try {
      const { data, error } = await this.supabaseClient
        .from('VOUCHERS')
        .delete()
        .eq('id', id)
        .select('*');
      if (error) {
        throw new Error(error.message);
      }

      const { error: storageError } = await this.supabaseClient.storage
        .from('VOUCHER_AI')
        .remove([`VOUCHERS/${data[0].img_name}`]);

      if (storageError) {
        throw new Error(
          `Failed to delete file from storage: ${storageError.message}`,
        );
      }

      return data;
    } catch (error) {
      console.log('Error in deleteVoucher:', error);
      throw error;
    }
  }
}
