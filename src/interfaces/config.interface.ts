interface ApiConfigProps {
  groqApiUrl: string;
  groqApiKey: string;
}

// interface MongodbConfigProps {
//   connectionString: string;
//   databaseName: string;
// }

export interface ConfigProps {
  port: number;
  api: ApiConfigProps;
}
