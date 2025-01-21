import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateVoucherPrompt } from '../utils/constants/prompt.constant';
import { ItemType, VoucherType } from '../types/vaucher.type';
import { SupabaseService } from 'src/modules/integrations/supabase/services/supabase.service';
import { ChatModelsAiService } from 'src/modules/integrations/chat-models-ai/services/chat-models-ai.service';
import { ModelVisionService } from 'src/modules/integrations/model-vision/services/model-vision.service';

@Injectable()
export class VoucherService {
  private readonly conf: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly chatModelsAiService: ChatModelsAiService,
    private readonly modelVisionService: ModelVisionService,
  ) {
    this.conf = {
      lang: 'eng',
      oem: 1,
      psm: 4,
    };
  }
  async findAllVouchers() {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
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

  async createVoucher(voucher: VoucherType, file: Express.Multer.File) {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('VOUCHERS')
        .insert({
          transaction_number: voucher.transaction_number,
          date: voucher.date ?? null,
          igv: voucher.igv ?? 0,
          total: voucher.total ?? 0,
          vendor: voucher.vendor ?? '',
          tax_amount: voucher.tax_amount ?? 0,
          client: voucher.client ?? '',
          img_name: file?.filename ?? '',
        })
        .select('*');
      if (error) {
        throw new Error(error.message);
      }
      if (file) {
        const uploadPath = path.join(
          __dirname,
          '../../../../uploads',
          file.filename,
        );
        const existFile = fs.existsSync(uploadPath);
        if (existFile) {
          const fileContent = fs.readFileSync(uploadPath);
          const { data: s3Data, error: s3Error } = await client.storage
            .from('VOUCHER_AI')
            .upload(`/VOUCHERS/${file.filename}`, fileContent);
          if (s3Error || !s3Data) {
            throw new Error(
              `Failed to upload file: ${s3Data}, ${s3Error.message}`,
            );
          }
          // delete file from uploads folder
          fs.unlinkSync(uploadPath);
        }
      }
      let itemsResponse = [];
      if (voucher.ITEMS.length) {
        const itemsToInsert = voucher.ITEMS.map((item: ItemType) => ({
          code: item.code,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          VOUCHER_ID: data[0].id,
        }));
        const { data: items, error: itemsError } = await client
          .from('ITEMS')
          .insert(itemsToInsert)
          .select('*');
        if (itemsError) {
          throw new Error(itemsError.message);
        }
        itemsResponse = items;
      }
      const newVoucher: VoucherType = {
        ...data[0],
        ITEMS: itemsResponse,
      };
      return JSON.stringify(newVoucher);
    } catch (error) {
      console.log('Error in createVoucher:', error);
      throw error;
    }
  }

  async deleteVoucher(id: string) {
    const client = this.supabaseService.getClient();
    try {
      const { data, error } = await client
        .from('VOUCHERS')
        .delete()
        .eq('id', id)
        .select('*');
      if (error) {
        throw new Error(error.message);
      }

      const { error: storageError } = await client.storage
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

  async getVoucherDataByModel(
    text: string,
    model: 'together' | 'groq' | 'gemini',
  ) {
    try {
      const prompt = generateVoucherPrompt(text ?? '');
      let response;
      if (model === 'together') {
        response = await this.chatModelsAiService
          .getResponseByTogether(
            prompt,
            'Eres un asistente experto en análisis de datos',
            'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            0.1,
          )
          .then((res) => res.choices?.[0]?.message?.content);
      } else if (model === 'groq') {
        response = await this.chatModelsAiService
          .getResponseByGroq(
            prompt,
            'Eres un asistente experto en análisis de datos',
            'mixtral-8x7b-32768',
            0.1,
          )
          .then((res) => res.choices?.[0]?.message?.content);
      } else if (model === 'gemini') {
        response = await this.chatModelsAiService
          .getResponseByGemini('gemini-1.5-flash', prompt)
          .then((res) => res);
      } else {
        throw new Error('Model not found');
      }

      const regex = /```json([\s\S]*?)```/;
      let match = response.match(regex);
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
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }

  async getVoucherDataByGoogleVision(
    file: Express.Multer.File,
    model: 'gemini' | 'together' | 'groq',
  ) {
    try {
      const textFromGoogleVision =
        await this.modelVisionService.scanVoucherByGoogleVision(file);
      const voucherData = await this.getVoucherDataByModel(
        textFromGoogleVision,
        model,
      );
      return voucherData;
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }

  async getVoucherDataByGroqVision(
    file: Express.Multer.File,
    model: 'gemini' | 'together' | 'groq',
  ) {
    try {
      console.log(model);
      const prompt = generateVoucherPrompt('');
      const textFromGroqVision =
        await this.modelVisionService.scanVoucherByGroqVision(
          file,
          prompt,
          'llama-3.2-11b-vision-preview',
          0.1,
        );
      const regex = /```json([\s\S]*?)```/;
      let match = textFromGroqVision.match(regex);
      let json = '';

      if (match) {
        json = match[1].trim();
      } else {
        const jsonRegex = /{[\s\S]*}/;
        match = textFromGroqVision.match(jsonRegex);
        if (match) {
          json = match[0].trim();
        } else {
          throw new Error('No JSON found in response');
        }
      }

      json = json.replace(/\\_/g, '_');
      const messageContent = JSON.parse(json);
      return messageContent;
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }
}
