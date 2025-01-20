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
  api: ApiConfigProps;
  pathToCredentials: string;
}
