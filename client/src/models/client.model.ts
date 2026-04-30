export interface ClientUsage {
  month: string; // "YYYY-MM"
  apiCalls: number;
}

export interface Client {
  _id: string;
  name: string;
  apiKey: string;
  monthlyLimit: number;
  usage: ClientUsage[];
  __v: number;
}
