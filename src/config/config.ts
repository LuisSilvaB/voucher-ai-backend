import { ConfigProps } from 'src/interfaces/config.interface';

export const config = (): ConfigProps => ({
  port: parseInt(process.env.PORT) || 3000,
  api: {
    groqApiUrl: process.env.GROQ_API_URL,
    groqApiKey: process.env.GROQ_API_KEY,
  },
});
