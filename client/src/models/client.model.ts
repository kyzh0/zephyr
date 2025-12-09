interface IClient {
  name: string;
  apiKey: string;
  monthlyLimit: number;
  usage: {
    month: string;
    apiCalls: number;
  }[];
}

export type { IClient };
