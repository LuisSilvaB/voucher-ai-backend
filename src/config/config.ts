import { ConfigProps } from 'src/interfaces/config.interface';

export const config = (): ConfigProps => ({
  port: parseInt(process.env.PORT) || 3001,
  pathToCredentials: process.env.PATH_TO_CREDENTIALS!,
  api: {
    groqApiUrl: process.env.GROQ_API_URL,
    groqApiKey: process.env.GROQ_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
    togetherApiKey: process.env.TOGETHER_API_KEY!,
    googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY!,
  },
});
