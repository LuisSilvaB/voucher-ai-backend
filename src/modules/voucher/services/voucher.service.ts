import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateVoucherPrompt } from '../utils/constants/prompt.constant';
import { ItemType, VoucherType } from '../types/vaucher.type';
import { SupabaseService } from '../../integrations/supabase/services/supabase.service';
import { ChatModelsAiService } from '../../integrations/chat-models-ai/services/chat-models-ai.service';
import { ModelVisionService } from '../../integrations/model-vision/services/model-vision.service';

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

      console.log(textFromGroqVision);
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

  async updateVoucher(voucher: VoucherType) {
    try {
      const client = this.supabaseService.getClient();
      const { ITEMS, id, ...rest } = voucher;
      const { data, error } = await client
        .from('VOUCHERS')
        .update(rest)
        .eq('id', id)
        .select('*, ITEMS(*)');
      if (error) {
        throw new Error(error.message);
      }
      const currentItemsIds = data[0].ITEMS.map((item) => item.id);
      const itemsIds = ITEMS.map((item) => item.id);

      const newItems = ITEMS.filter(
        (item) => !currentItemsIds.includes(item.id),
      );

      if (newItems.length) {
        const itemsToInsert = newItems.map((item: ItemType) => ({
          code: item.code,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          VOUCHER_ID: voucher.id,
        }));
        const itemsInsertResponse = await client
          .from('ITEMS')
          .insert(itemsToInsert)
          .select('*');
        if (itemsInsertResponse.error) {
          throw new Error(itemsInsertResponse.error.message);
        }
      }

      const oldItems = currentItemsIds.filter((id) => !itemsIds.includes(id));

      if (oldItems.length) {
        const itemsToDelete = oldItems.map(async (id) => {
          await client.from('ITEMS').delete().eq('id', id);
        });

        if (itemsToDelete.error) {
          throw new Error(itemsToDelete.error.message);
        }
      }

      return { ...data[0], ITEMS };
    } catch (error) {
      console.log('Error in updateVoucher:', error);
      throw error;
    }
  }

  async updateVoucherImg(voucher_id: string, file: Express.Multer.File) {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('VOUCHERS')
        .update({
          img_name: file?.filename ?? null,
        })
        .eq('id', voucher_id)
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
          fs.unlinkSync(uploadPath);
        }
      }
      return data[0];
    } catch (error) {
      console.log('Error in updateVoucherImg:', error);
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

      return data[0];
    } catch (error) {
      console.log('Error in deleteVoucher:', error);
      throw error;
    }
  }

  async deleteVoucherImg(voucherId: string, img_name: string) {
    try {
      const client = this.supabaseService.getClient();
      // delete from database
      const { data, error } = await client
        .from('VOUCHERS')
        .update({
          img_name: null,
        })
        .eq('id', voucherId)
        .select('*');
      if (error) {
        throw new Error(error.message);
      }

      // delete from storage
      const { error: storageError } = await client.storage
        .from('VOUCHER_AI')
        .remove([`VOUCHERS/${img_name}`]);

      if (storageError) {
        throw new Error(
          `Failed to delete file from storage: ${storageError.message}`,
        );
      }
      return data[0];
    } catch (error) {
      console.log('Error in deleteVoucherImg:', error);
      throw error;
    }
  }
}
