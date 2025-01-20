import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Together from 'together-ai';
import axios from 'axios';

@Injectable()
export class ChatModelsAiService {
  private readonly GROQ_API_URL: string;
  private readonly GROQ_API_KEY: string;
  private readonly TOGETHER_API_KEY: string;
  private readonly GOOGLE_CLOUD_API_KEY: string;
  private readonly textServiceClient: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    this.GROQ_API_URL = this.configService.get('api.groqApiUrl');
    this.GROQ_API_KEY = this.configService.get('api.groqApiKey');
    this.TOGETHER_API_KEY = this.configService.get('api.togetherApiKey');
    this.GOOGLE_CLOUD_API_KEY = this.configService.get('api.googleCloudApiKey');
    this.textServiceClient = new GoogleGenerativeAI(this.GOOGLE_CLOUD_API_KEY);
  }

  async getResponseByGroq(
    userPrompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
  ) {
    try {
      const response = await axios.post(
        this.GROQ_API_URL,
        {
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          model: model,
          temperature: temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${this.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log('Error in getResponseByGroq:', error);
      throw error;
    }
  }

  async getResponseByTogether(
    userPrompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
  ) {
    try {
      const together = new Together({
        apiKey: this.TOGETHER_API_KEY,
      });

      const response = await together.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: model,
        temperature: temperature,
      });
      return response;
    } catch (error) {
      console.error('Error in getResponseByTogether:', error);
      throw error;
    }
  }

  async getResponseByGemini(model: string, prompt: string) {
    try {
      const modelAi = this.textServiceClient.getGenerativeModel({
        model: model,
      });
      const response = await modelAi.generateContent(prompt);
      return response.response.text();
    } catch (error) {
      console.log('Error in getResponseByGemini:', error);
      throw error;
    }
  }
}
