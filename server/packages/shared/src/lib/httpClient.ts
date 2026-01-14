import axios, { type AxiosInstance } from 'axios';
import http from 'node:http';
import https from 'node:https';

export const httpClient: AxiosInstance = axios.create({
  timeout: 30_000,
  httpAgent: new http.Agent({ timeout: 30_000, keepAlive: true }),
  httpsAgent: new https.Agent({ timeout: 30_000, keepAlive: true }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'
  }
});
