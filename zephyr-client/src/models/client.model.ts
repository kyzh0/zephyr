interface IClient {
  name: string;
  apiKey: string;
  monthlyLimit: number;
  usage: Array<{
    month: string;
    apiCalls: number;
  }>;
}

export type { IClient };
