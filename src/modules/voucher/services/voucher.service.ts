import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import Together from 'together-ai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateVoucherPrompt } from '../utils/constants/prompt.constant';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ItemType, VoucherType } from '../types/vaucher.type';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class VoucherService {
  private readonly GROQ_API_URL: string;
  private readonly GROQ_API_KEY: string;
  private readonly TOGETHER_API_KEY: string;
  private readonly GOOGLE_CLOUD_API_KEY: string;
  private readonly PATH_TO_CREDENTIALS: string;
  private readonly supabaseClient: SupabaseClient;
  private readonly cloudVisionClient: ImageAnnotatorClient;
  private readonly textServiceClient: GoogleGenerativeAI;
  private readonly conf: any;
  private readonly logger = new Logger(VoucherService.name);

  constructor(private readonly configService: ConfigService) {
    this.GROQ_API_URL = this.configService.get('api.groqApiUrl');
    this.GROQ_API_KEY = this.configService.get('api.groqApiKey');
    this.TOGETHER_API_KEY = this.configService.get('api.togetherApiKey');
    this.PATH_TO_CREDENTIALS = this.configService.get('pathToCredentials');
    this.GOOGLE_CLOUD_API_KEY = this.configService.get('api.googleCloudApiKey');
    this.supabaseClient = createClient(
      this.configService.get('api.supabaseUrl'),
      this.configService.get('api.supabaseKey'),
    );
    this.cloudVisionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../../../', this.PATH_TO_CREDENTIALS),
          'utf-8',
        ),
      ),
    });
    this.textServiceClient = new GoogleGenerativeAI(this.GOOGLE_CLOUD_API_KEY);
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

  async scanVoucherGroq(text: string) {
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
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }

  async scanVoucherTogether(text: string) {
    try {
      const together = new Together({
        apiKey: this.TOGETHER_API_KEY,
      });

      const prompt = generateVoucherPrompt(text || '');
      const response = await together.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert voucher analyzer.' },
          { role: 'user', content: prompt },
        ],
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        temperature: 0.1,
      });

      const regex = /```json([\s\S]*?)```/;
      let match = response.choices?.[0]?.message?.content?.match(regex);
      let json = '';

      if (match) {
        json = match[1].trim();
      } else {
        const jsonRegex = /{[\s\S]*}/;
        match = response.choices?.[0]?.message?.content?.match(jsonRegex);
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
      console.error('Error in scanVoucherTogether:', error);
      throw error;
    }
  }

  async scanVoucherGoogleVisionAndGemini(file: Express.Multer.File) {
    try {
      const uploadPath = path.join(
        __dirname,
        '../../../../uploads',
        file.filename,
      );
      const existFile = fs.existsSync(uploadPath);
      if (existFile) {
        // const fileContent = fs.readFileSync(uploadPath);
        const [result] = await this.cloudVisionClient.textDetection(uploadPath);
        const modelAi = this.textServiceClient.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        const prompt = generateVoucherPrompt(result.fullTextAnnotation.text);
        const response = await modelAi.generateContent(prompt);
        const regex = /```json([\s\S]*?)```/;
        let match = response.response.text().match(regex);
        let json = '';
        if (match) {
          json = match[1].trim();
        } else {
          const jsonRegex = /{[\s\S]*}/;
          match = response.response.text().match(jsonRegex);
          if (match) {
            json = match[0].trim();
          } else {
            throw new Error('No JSON found in response');
          }
        }
        json = json.replace(/\\_/g, '_');
        const messageContent = JSON.parse(json);
        return messageContent;
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.log('Error in scanVoucher:', error);
      throw error;
    }
  }

  async createVoucher(voucher: VoucherType, file: Express.Multer.File) {
    try {
      const { data, error } = await this.supabaseClient
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
          const { data: s3Data, error: s3Error } =
            await this.supabaseClient.storage
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
        const { data: items, error: itemsError } = await this.supabaseClient
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
