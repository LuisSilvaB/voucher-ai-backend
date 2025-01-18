import { ConfigProps } from 'src/interfaces/config.interface';

export const config = (): ConfigProps => ({
  port: parseInt(process.env.PORT) || 3001,
  api: {
    groqApiUrl: process.env.GROQ_API_URL,
    groqApiKey: process.env.GROQ_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
  },
});
