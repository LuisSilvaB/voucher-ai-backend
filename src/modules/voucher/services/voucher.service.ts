import { Injectable } from '@nestjs/common';
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
  async scanVoucher(text: string) {
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

      const regex = /```json([\s\S]*?)```/;
      const match = response.data.choices[0].message.content.match(regex);
      if (!match) {
        throw new Error('No JSON found in response');
      }

      const json = match[1].trim();
      const messageContent = JSON.parse(json);

      console.log('Message Content:', messageContent);

      const { data, error } = await this.supabaseClient
        .from('VOUCHERS')
        .insert({
          transaction_number: messageContent.transaction_number,
          date: messageContent.date,
          igv: messageContent.igv,
          total: messageContent.total,
          vendor: messageContent.vendor,
          tax_amount: messageContent.tax_amount,
          client: messageContent.client,
        })
        .select('*');
      if (error) {
        throw new Error(error.message);
      }

      const itemsToInsert = messageContent.items.map((item: ItemType) => ({
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        VOUCHER_ID: data[0].id,
      }));
      const { data: items, error: itemsError } = await this.supabaseClient
        .from('ITEMS')
        .insert(itemsToInsert)
        .select('*');
      if (itemsError) {
        throw new Error(itemsError.message);
      }
      const newVoucher: VoucherType = {
        ...data[0],
        ITEMS: items,
      };
      return JSON.stringify(newVoucher);
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }
}
