import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly supabaseClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('api.supabaseUrl');
    const supabaseKey = this.configService.get<string>('api.supabaseKey');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase URL or Key is not defined in the environment variables.',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  getClient() {
    try {
      return this.supabaseClient;
    } catch (e) {
      console.log(e);
    }
  }
}
