import axios from 'axios';
import http from 'http';
import https from 'https';

const httpClient = axios.create({
  timeout: 30000,
  httpAgent: new http.Agent({ timeout: 30000, keepAlive: true }),
  httpsAgent: new https.Agent({ timeout: 30000, keepAlive: true }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'
  }
});

export default httpClient;
