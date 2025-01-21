interface ApiConfigProps {
  groqApiUrl: string;
  groqApiKey: string;
  togetherApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  googleCloudApiKey: string;
}

export interface ConfigProps {
  port: number;
  corsOrigin: string;
  api: ApiConfigProps;
  pathToCredentials: string;
}
